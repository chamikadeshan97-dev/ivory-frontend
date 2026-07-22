QueueDisplay CSS Themes

Files included:
QueueDisplay13.css to QueueDisplay22.css

Use with your button-row JSX by changing the theme numbers to 13–22.

Example:
const themeOptions = Array.from({ length: 10 }, (_, index) =>
  String(index + 13)
);

Keep your JSX classes like:
<div className="queue-number-circle serving">...</div>
<div className="queue-number-circle next">...</div>
<Tag className="status-tag serving pulse-tag">In Treatment</Tag>
<Tag className="status-tag next">Please Be Ready</Tag>

Copy these CSS files into your ./css/ folder.
