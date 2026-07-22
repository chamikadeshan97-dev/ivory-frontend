Queue Display CSS Themes

How to use:
1. Copy any CSS file into your React component folder.
2. Change your QueueDisplay.jsx import, for example:
   import "./QueueDisplayTheme_GlassTeal.css";

Recommended JSX classes:
- Now Serving number:
  <div className="queue-number-circle serving">{currentInside.queue_no}</div>

- Next Patient number:
  <div className="queue-number-circle next">{nextOne.queue_no}</div>

- Now Serving tag:
  <Tag className="status-tag serving pulse-tag">In Treatment</Tag>

- Next Patient tag:
  <Tag className="status-tag next">Please Be Ready</Tag>

Included themes:
1. QueueDisplayTheme_WarmBeige.css
2. QueueDisplayTheme_GlassTeal.css
3. QueueDisplayTheme_SlatePro.css
4. QueueDisplayTheme_RoyalBlue.css
5. QueueDisplayTheme_DarkAqua.css
6. QueueDisplayTheme_LuxuryCream.css
