# Setup wizard demo. The wizard shows a banner, "Step n of 5" headers, a spinner on the appliance
# check and an aligned summary with file modes, so the window is taller than the other tapes.
# Regenerate the GIF after any wizard change: see scripts/demo/README.md.
Output docs/assets/demo/setup.gif
Require node
Require asciinema
Set Shell "bash"
Set FontFamily "Menlo"
Set FontSize 18
Set Width 1180
Set Height 860
Set Padding 20
Set Theme "GitHub Dark"
Set TypingSpeed 45ms
Set Framerate 30
Hide
Type "bash scripts/demo/terminal.sh"
Enter
Sleep 1s
Type "clear"
Enter
Sleep 200ms
Show
Type "node dist/src/index.js setup"
Sleep 400ms
Enter
Sleep 600ms
Type "https://192.168.0.111:8444"
Sleep 300ms
Enter
Sleep 500ms
Type "1"
Enter
Sleep 700ms
Type "mock-public-token"
Enter
Sleep 400ms
Type "mock-private-token"
Enter
Sleep 900ms
Type "1"
Enter
Sleep 1500ms
Type "opencode"
Sleep 350ms
Enter
# Hold the summary table and the "Next: open OpenCode and ask" hint.
Sleep 6s
Hide
Type "exit"
Enter
Sleep 500ms
