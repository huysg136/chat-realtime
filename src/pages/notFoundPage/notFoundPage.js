import React from 'react';
import './notFoundPage.scss';

export default function NotFoundPage() {

    return (
        <div className="not-found-container">
            <div className="not-found-content">
                <h1 className="not-found-code">404</h1>
                <h2 className="not-found-title">Page not found</h2>
                <p className="not-found-desc">
                    The page you're looking for doesn't exist or has been moved.
                </p>
            </div>

            <div className="footer-credit">
                © {new Date().getFullYear()} Copyright by <span className="author-name">Thái Gia Huy</span> · quik.id.vn
            </div>
        </div>
    );
}