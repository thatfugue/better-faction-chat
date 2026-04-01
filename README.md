<p>
  <strong>[WARNING]</strong>&nbsp;This plugin is in the BETA phase and may contain bugs. I originally created this
  plugin for my own use but I&rsquo;ve decided to continue developing it with community support. Thank you for your
  understanding.<br /><br />Hey everyone,<br /><br />Faction chat is the heart of Torn, but the default UI is missing
  some serious quality-of-life features. Over the past while, I've been developing and refining a script to completely
  overhaul the Faction Chat experience. It is 100% compatible with Torn's new React UI, highly optimized to prevent lag,
  and fixes the annoying scrolling bugs found in older chat scripts.
</p>
<h3>✨ Key Features</h3>
<ul>
  <li>
    <p>
      ⌚ Visible<strong>&nbsp;Timestamps:</strong> We've made message timestamps far more accessible and prominent.
      Instead of hiding them behind tooltips or making them hard to read, exact TCT times are elegantly displayed right
      next to every message for quick, at-a-glance reading.
    </p>
  </li>
  <li>
    <p>
      🟢 <strong>Live Player Status:</strong> Adds a clean Online (Green), Idle (Yellow), or Offline (Grey) dot next to
      the sender's name.
    </p>
  </li>
  <li>
    <p>
      ✈️ <strong>State Icons:</strong> Instantly see if a faction mate is traveling (🌍), in the hospital (🏥), or in
      jail (⛓️) directly in the chat without having to click their profile.
    </p>
  </li>
  <li>
    <p>
      🔔 <strong>Smart @Mention Alerts:</strong> Get notified with a customizable sound beep and browser popup when
      someone drops your name.
      <i
        >Note: Includes a custom deduping memory system, so you won't get spammed with repeated alerts when scrolling up
        and down the chat!</i
      >
    </p>
  </li>
  <li>
    <p>
      🔍 <strong>Built-in Chat Search:</strong> Easily search for specific messages or keywords within the loaded chat
      using a sleek search bar.
    </p>
  </li>
  <li>
    <p>
      📋 <strong>Clean Copy Button:</strong> Hover over any message to reveal a sleek "Copy" icon. It copies
      <i>only</i> the message text, ignoring the timestamp and username.
    </p>
  </li>
  <li>
    <p>
      ⚙️ <strong>Highly Customizable UI:</strong> A dedicated settings panel (gear icon in the bottom left) lets you
      toggle features, adjust the volume, and change the UI colors to match your personal Torn theme.
    </p>
  </li>
</ul>
<h3>📸 Screenshots</h3>
<p>&nbsp;</p>
<p>
  <strong
    ><a href="https://editor.torn.com/55ecfe3e-f0d9-42a9-8473-393c237a90ed-4141121.png" target="_blank" rel="noopener"
      ><img
        style="display: block; margin-left: auto; margin-right: auto;"
        src="https://editor.torn.com/55ecfe3e-f0d9-42a9-8473-393c237a90ed-4141121.png"
        alt="55ecfe3e-f0d9-42a9-8473-393c237a90ed-4141121.png" /></a
  ></strong>
</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>
  <strong
    ><a href="https://editor.torn.com/0aaa7369-aa89-450e-8165-fdcf3cf1a4f0-4141121.png" target="_blank" rel="noopener"
      ><img
        style="display: block; margin-left: auto; margin-right: auto;"
        src="https://editor.torn.com/0aaa7369-aa89-450e-8165-fdcf3cf1a4f0-4141121.png"
        alt="0aaa7369-aa89-450e-8165-fdcf3cf1a4f0-4141121.png" /></a
  ></strong>
</p>
<p>&nbsp;</p>
<p>
  <strong
    ><a href="https://editor.torn.com/f8b5da52-711e-4856-bba8-d8c44ca6728f-4141121.png" target="_blank" rel="noopener"
      ><img
        style="display: block; margin-left: auto; margin-right: auto;"
        src="https://editor.torn.com/f8b5da52-711e-4856-bba8-d8c44ca6728f-4141121.png"
        alt="f8b5da52-711e-4856-bba8-d8c44ca6728f-4141121.png" /></a
  ></strong>
</p>
<p>&nbsp;</p>
<p>
  <strong
    ><a href="https://editor.torn.com/dbbc9b83-a5cb-4e68-b0d1-c0accb78c78e-4141121.png" target="_blank" rel="noopener"
      ><img
        style="display: block; margin-left: auto; margin-right: auto;"
        src="https://editor.torn.com/dbbc9b83-a5cb-4e68-b0d1-c0accb78c78e-4141121.png"
        alt="dbbc9b83-a5cb-4e68-b0d1-c0accb78c78e-4141121.png" /></a
  ></strong>
</p>
<p>&nbsp;</p>
<p>
  <strong
    ><a href="https://editor.torn.com/dbbc9b83-a5cb-4e68-b0d1-c0accb78c78e-4141121.png" target="_blank" rel="noopener"
      ><img
        style="display: block; margin-left: auto; margin-right: auto;"
        src="https://editor.torn.com/48d090db-6e07-4a66-9d5e-6202d0ebda2b-4141121.png"
        alt="48d090db-6e07-4a66-9d5e-6202d0ebda2b-4141121.png" /></a
  ></strong>
</p>
<p>&nbsp;</p>
<h3>🛠️ Installation &amp; Setup</h3>
<ol>
  <li>
    <p>
      Make sure you have a user script manager installed like <strong>Tampermonkey</strong> or
      <strong>Violentmonkey</strong>.
    </p>
  </li>
  <li>
    <p>
      <a href="https://greasyfork.org/tr/scripts/572030-better-faction-chat-torn-com" target="_blank" rel="noopener"
        >Click Here to install from GreasyFork</a
      >
    </p>
  </li>
  <li>
    <p>Refresh Torn. You will see a new ⚙️ gear icon in the bottom left corner of your screen.</p>
  </li>
  <li>
    <p>Click it to open the settings panel, input your API key, and customize your experience.</p>
  </li>
</ol>
<p>
  <strong>🔒 Note on the API Key:</strong> The script requires a <strong>Limited Access API Key</strong>. Why? It only
  uses this to securely fetch the <code>/faction/?selections=basic</code> data (to display the online/offline dots and
  travel icons) and to ping <code>/user/?selections=basic</code> once to automatically detect your username for the
  @mention system. Your key never leaves your browser.
</p>
<p>&nbsp;</p>
<hr />
<h3>💊 Buy Me a Coffee (Or a Xanax!)</h3>
<p>
  If you enjoy using this script and want to show some support, donations in the form of <strong>Xanax</strong> are
  highly appreciated! It keeps the energy up for future updates and helps me stay focused.
</p>
<p>
  💻 <strong>Need Coding Help?</strong><br />I am also available to help the community with any script ideas, custom
  programming requests, or coding issues you might be struggling with. Feel free to reach out to me in-game or drop a
  message here. I'm always happy to help!
</p>
<ul>
  <li><strong>sercann [4141121]</strong></li>
</ul>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>
  <strong>Version Changes:<br />v1.0.1 - Added .hasFocus() for all notification system.</strong>
</p>
