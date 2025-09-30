export default function ApiHome() {
  return (
    <div className="container">
      <h1>🚀 Twitter Automation Platform API</h1>
      <p>Backend API server is running successfully.</p>

      <div className="grid">
        <div className="card">
          <h2>📋 Available Endpoints</h2>
          <h3>Authentication:</h3>
          <ul>
            <li>
              <code>POST /api/auth/register</code> - Device registration
            </li>
            <li>
              <code>POST /api/auth/fingerprint</code> - Generate fingerprint
            </li>
            <li>
              <code>POST /api/auth/verify</code> - Verify device
            </li>
          </ul>

          <h3>System:</h3>
          <ul>
            <li>
              <code>GET /api/health</code> - Server health check
            </li>
            <li>
              <code>GET /api/status</code> - System status
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>🔐 Security Features</h2>
          <ul>
            <li>Double-hash device fingerprinting</li>
            <li>IP-based authentication</li>
            <li>Nonce-based session management</li>
            <li>CORS restrictions by IP</li>
            <li>Rate limiting protection</li>
          </ul>
        </div>

        <div className="card">
          <h2>📊 Server Status</h2>
          <p>
            <strong>Status:</strong>{" "}
            <span className="status-online">✅ Online</span>
          </p>
          <p>
            <strong>Environment:</strong>{" "}
            {process.env.NODE_ENV || "development"}
          </p>
          <p>
            <strong>Version:</strong> 2.0.0
          </p>
          <p>
            <strong>Database:</strong> Local PostgreSQL
          </p>
        </div>

        <div className="card">
          <h2>🛡️ Security Architecture</h2>
          <p>
            <strong>Step 1:</strong> Device fingerprint from hardware data
          </p>
          <p>
            <strong>Step 2:</strong> Final hash with IP + nonce
          </p>
          <p>
            <strong>Session:</strong> Active connection based
          </p>
          <p>
            <strong>Recovery:</strong> 5 backup emails required
          </p>
        </div>
      </div>
    </div>
  );
}
