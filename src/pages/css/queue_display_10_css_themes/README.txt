QueueDisplay CSS Themes

Files included:
QueueDisplay1.css to QueueDisplay10.css

Use with your button-row JSX:
const themeFiles = import.meta.glob("./css/QueueDisplay*.css", {
  query: "?url",
  import: "default",
  eager: true,
});

Keep your JSX classes like:
<div className="queue-number-circle serving">...</div>
<div className="queue-number-circle next">...</div>
<Tag className="status-tag serving pulse-tag">In Treatment</Tag>
<Tag className="status-tag next">Please Be Ready</Tag>

Copy these 10 CSS files into:
src/.../css/
or wherever your QueueDisplay.jsx is expecting ./css/QueueDisplay1.css etc.
