/**
 * SCGI Transport for rTorrent
 *
 * Implements the SCGI framing protocol over TCP or Unix domain socket,
 * enabling direct connection to rTorrent without an HTTP proxy (nginx/Apache).
 *
 * Exposes the same `methodCall(method, params, callback)` interface as the
 * `xmlrpc` package's client, so RtorrentHandler can swap transports transparently.
 *
 * SCGI request format:
 *   <header_length>:<null-separated headers>,<xml body>
 *
 * Required SCGI headers:
 *   CONTENT_LENGTH\0<body_length>\0SCGI\01\0
 *
 * Response format:
 *   HTTP-like status line + headers, terminated by \r\n\r\n, followed by XML body
 */

'use strict';

const net = require('net');
const Serializer = require('xmlrpc/lib/serializer');
const Deserializer = require('xmlrpc/lib/deserializer');
const { PassThrough } = require('stream');

class ScgiTransport {
  /**
   * @param {Object} options
   * @param {string} [options.host] - TCP host (for SCGI over TCP)
   * @param {number} [options.port] - TCP port (for SCGI over TCP)
   * @param {string} [options.socketPath] - Unix socket path (for SCGI over Unix socket)
   */
  constructor(options = {}) {
    this.host = options.host || null;
    this.port = options.port || null;
    this.socketPath = options.socketPath || null;
  }

  /**
   * Build an SCGI-framed request from an XML body string.
   * @param {string} xmlBody - XML-RPC request body
   * @returns {Buffer} Complete SCGI request
   */
  _buildScgiRequest(xmlBody) {
    const bodyBuf = Buffer.from(xmlBody, 'utf8');
    const bodyLength = bodyBuf.length;

    // Build null-separated SCGI header pairs: key\0value\0key\0value\0
    const headers = 'CONTENT_LENGTH\x00' + bodyLength + '\x00SCGI\x001\x00';
    const headerBuf = Buffer.from(headers, 'binary');

    // Netstring framing: "<header_byte_length>:<headers>,<body>"
    const prefix = Buffer.from(`${headerBuf.length}:`, 'ascii');
    const comma = Buffer.from(',', 'ascii');

    return Buffer.concat([prefix, headerBuf, comma, bodyBuf]);
  }

  /**
   * Strip HTTP-like response headers from SCGI response, return XML body.
   * rTorrent sends: "Status: 200 OK\r\nContent-Type: text/xml\r\n\r\n<xml>"
   * @param {Buffer} data - Full response buffer
   * @returns {string} XML body
   */
  _parseScgiResponse(data) {
    const str = data.toString('utf8');
    const separator = '\r\n\r\n';
    const idx = str.indexOf(separator);
    if (idx === -1) {
      // No headers found — treat entire response as XML body
      return str;
    }
    return str.substring(idx + separator.length);
  }

  /**
   * xmlrpc-compatible methodCall interface.
   * Each call creates a new TCP/Unix socket connection, sends the SCGI request,
   * reads the full response, and parses the XML-RPC result.
   *
   * @param {string} method - XML-RPC method name
   * @param {Array} params - XML-RPC parameters
   * @param {function} callback - (error, value) callback
   */
  methodCall(method, params, callback) {
    try {
      // Serialize XML-RPC request using the xmlrpc library
      const xml = Serializer.serializeMethodCall(method, params);
      const scgiRequest = this._buildScgiRequest(xml);

      const connectOptions = this.socketPath
        ? { path: this.socketPath }
        : { host: this.host, port: this.port };

      const socket = net.createConnection(connectOptions);
      const chunks = [];
      let completed = false;

      const finish = (err, result) => {
        if (completed) return;
        completed = true;
        socket.destroy();
        callback(err, result);
      };

      socket.setTimeout(30000); // 30s timeout (matches HTTP XML-RPC behavior)

      socket.on('connect', () => {
        socket.write(scgiRequest);
      });

      socket.on('data', (chunk) => {
        chunks.push(chunk);
      });

      socket.on('end', () => {
        try {
          const fullResponse = Buffer.concat(chunks);
          const xmlBody = this._parseScgiResponse(fullResponse);

          // Use xmlrpc's Deserializer to parse the XML-RPC response
          const deserializer = new Deserializer('utf8');
          const stream = new PassThrough();
          deserializer.deserializeMethodResponse(stream, (err, value) => {
            finish(err, value);
          });
          stream.end(xmlBody);
        } catch (err) {
          finish(err);
        }
      });

      socket.on('timeout', () => {
        finish(new Error('SCGI connection timeout'));
      });

      socket.on('error', (err) => {
        finish(err);
      });
    } catch (err) {
      process.nextTick(() => callback(err));
    }
  }
}

module.exports = ScgiTransport;
