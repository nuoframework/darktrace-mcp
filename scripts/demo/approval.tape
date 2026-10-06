# render-approval.sh crops the native startup banner from this raw recording.
Output "/private/tmp/darktrace-approval-raw.gif"
Require claude
Set Shell "bash"
Set FontFamily "Menlo"
Set FontSize 18
Set Width 1120
Set Height 690
Set Padding 20
Set Theme "GitHub Dark"
Set TypingSpeed 45ms
Set Framerate 30
Set WaitTimeout 120s
Hide
Type "export PS1='$ '; clear; echo; echo; echo; echo; echo"
Enter
Sleep 300ms
Show
Type "node scripts/demo/approval-client.mjs"
Sleep 400ms
Enter
Hide
Wait+Screen /Yes, I trust this folder/
Sleep 1s
Down
Sleep 600ms
Enter
Sleep 5s
Type@15ms "Preview then execute post_antigena codeid 1 activate 60s reason demo, confirm it. After a decline, stop and report the MCP server refusal briefly."
Enter
Wait+Screen /requests your input/
Sleep 1s
Show
Sleep 4s
Down
Sleep 600ms
Right
Sleep 1s
Enter
Sleep 1s
Hide
Wait+Screen /declined|denied/
Sleep 3s
Show
Sleep 5s
Hide
Ctrl+C
Ctrl+C
Sleep 1s
