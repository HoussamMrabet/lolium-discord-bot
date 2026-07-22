import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page">
      <div className="container">
        <div className="stub bevel">
          <div className="ic">🧭</div>
          <h2>Page not found</h2>
          <p>That page recalled to base. Let’s get you back.</p>
          <Link className="btn btn-ghost bevel" to="/" style={{ marginTop: 22 }}>
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
