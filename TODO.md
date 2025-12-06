# TODO: Apply _all.scss grid to chatRoom/index.js and remove Ant Design Row

## Steps to Complete
- [ ] Edit _all.scss to add all missing .col-*-0 through .col-*-12 classes for xs, sm, md, lg, and xl breakpoints.
- [ ] Edit index.js: Remove import of Row and Col from antd.
- [ ] Edit index.js: Replace <Row> with <div className="chat-room">.
- [ ] Edit index.js: Replace each <Col> with <div className="col-xs-{adjusted} col-sm-{adjusted} col-md-{adjusted} col-lg-{adjusted} col-xl-{adjusted}">, mapping Ant Design spans to 12-column equivalents (e.g., xs=24 -> col-xs-12, md=6 -> col-md-3, etc.).
