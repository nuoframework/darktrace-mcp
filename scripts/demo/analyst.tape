# First run: python3 scripts/demo/record.py analyst
# VHS renders the fresh live-output cast, shortening only idle gaps.
Output docs/assets/demo/analyst.gif
Require asciinema
Set Shell "bash"
Set FontFamily "Menlo"
Set FontSize 18
Set Width 1120
Set Height 690
Set Padding 20
Set Theme "GitHub Dark"
Set Framerate 30
Hide
Type "asciinema play --quiet --speed 1 --idle-time-limit 1.2 scripts/demo/analyst.cast"
Enter
Sleep 100ms
Show
Sleep 17s
