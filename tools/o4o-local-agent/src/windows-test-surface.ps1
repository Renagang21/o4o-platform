# O4O Local Work Agent — Windows UIA Canonical Test Surface (WO-O4O-WINDOWS-UIA-CANONICAL-TEST-SURFACE-V0)
#
# 무엇인가: O4O 가 UIA 노출 상태를 스스로 정하는 **개발/검증용 계측 창** 하나. 외부 앱(메모장 · 카카오톡)은 PC · 버전마다 UIA 노출이
# 달라 공통 자동화층(UIA · Safety · Takeover)의 회귀와 앱 특수 문제를 구분할 수 없다 — 이 창이 공통층의 고정 회귀 대상이다.
# 제품 기능이 아니다. 일반 Work Agent 대상이 아니고(서버 등재부에 없다), `node src/index.mjs test-surface` 로만 뜬다.
#
# 만드는 것(모두 Windows 기본 .NET WinForms — 새 런타임 · 패키지 0):
#   TextBox(TextInput) · Button(Action) · Button(전송, ENTER = AcceptButton) · ListBox(Alpha/Bravo/Charlie) · CheckBox(Option)
#   · CheckBox(Title marker — 창 제목에 " *" 표식) · ComboBox(One/Two/Three) · TabControl(Tab A/Tab B) · Button(Open Modal → 모달 Form)
#   · **CustomRows**: Panel 에 행 3개를 직접 그린다(OnPaint). AccessibleRole=List 라 UIA 에는 List 컨테이너로 보이지만 행은 자식으로
#     노출되지 않는다 — 카카오톡 목록과 같은 "보이지만 구조적으로 고를 수 없는 영역".
#   상태 Label 8개("Current text:" · "Selected item:" · "Checkbox:" · "Combo:" · "Active tab:" · "Last action:" · "Last submitted:" · "Custom row:")
#   — UIA Text 요소의 이름이 곧 상태라 재관찰(inspect)만으로 결과를 읽는다.
#
# 하지 않는 것: 외부 부작용 0(파일 · 네트워크 · 프로세스 · 클립보드 없음) · 입력 hook 0 · 로그 0 · 실제 사용자 데이터 0(고정 synthetic 값만).
# 입력: 없음(환경변수 · argv 모두 읽지 않는다). 종료: 사용자가 창을 닫는다.

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$TITLE = 'O4O UIA Test Surface'
$script:actionCount = 0

$form = New-Object System.Windows.Forms.Form
$form.Text = $TITLE
$form.Name = 'O4OTestSurface'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object System.Drawing.Size(720, 600)
$form.MinimumSize = $form.Size
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

function NewLabel([string]$name, [string]$text, [int]$x, [int]$y, [int]$w) {
    $l = New-Object System.Windows.Forms.Label
    $l.Name = $name; $l.Text = $text; $l.AutoSize = $false
    $l.Location = New-Object System.Drawing.Point($x, $y); $l.Size = New-Object System.Drawing.Size($w, 20)
    return $l
}

# ── 왼쪽: 노출되는 표준 컨트롤 ─────────────────────────────────────────────
$form.Controls.Add((NewLabel 'CaptionText' 'Text:' 16 16 60))
$tb = New-Object System.Windows.Forms.TextBox
$tb.Name = 'TextInput'; $tb.AccessibleName = 'TextInput'
$tb.Location = New-Object System.Drawing.Point(80, 12); $tb.Size = New-Object System.Drawing.Size(240, 24)
$form.Controls.Add($tb)

$btnAction = New-Object System.Windows.Forms.Button
$btnAction.Name = 'ActionButton'; $btnAction.Text = 'Action'
$btnAction.Location = New-Object System.Drawing.Point(330, 10); $btnAction.Size = New-Object System.Drawing.Size(80, 28)
$form.Controls.Add($btnAction)

$btnSubmit = New-Object System.Windows.Forms.Button
$btnSubmit.Name = 'SubmitButton'; $btnSubmit.Text = '전송'
$btnSubmit.Location = New-Object System.Drawing.Point(420, 10); $btnSubmit.Size = New-Object System.Drawing.Size(80, 28)
$form.Controls.Add($btnSubmit)
# ENTER(입력창) = 전송. 외부 부작용 없음 — 화면 내부 상태만 바뀐다.
$form.AcceptButton = $btnSubmit

$form.Controls.Add((NewLabel 'CaptionList' 'List:' 16 52 60))
$lb = New-Object System.Windows.Forms.ListBox
$lb.Name = 'ExposedList'; $lb.AccessibleName = 'ExposedList'
[void]$lb.Items.Add('Alpha'); [void]$lb.Items.Add('Bravo'); [void]$lb.Items.Add('Charlie')
$lb.Location = New-Object System.Drawing.Point(80, 50); $lb.Size = New-Object System.Drawing.Size(160, 70)
$form.Controls.Add($lb)

$cb = New-Object System.Windows.Forms.CheckBox
$cb.Name = 'OptionCheck'; $cb.Text = 'Option'
$cb.Location = New-Object System.Drawing.Point(260, 50); $cb.Size = New-Object System.Drawing.Size(120, 24)
$form.Controls.Add($cb)

$cbTitle = New-Object System.Windows.Forms.CheckBox
$cbTitle.Name = 'TitleMarkerCheck'; $cbTitle.Text = 'Title marker'
$cbTitle.Location = New-Object System.Drawing.Point(260, 78); $cbTitle.Size = New-Object System.Drawing.Size(120, 24)
$form.Controls.Add($cbTitle)

$form.Controls.Add((NewLabel 'CaptionCombo' 'Combo:' 400 52 60))
$combo = New-Object System.Windows.Forms.ComboBox
$combo.Name = 'ChoiceCombo'; $combo.AccessibleName = 'ChoiceCombo'; $combo.DropDownStyle = 'DropDownList'
[void]$combo.Items.Add('One'); [void]$combo.Items.Add('Two'); [void]$combo.Items.Add('Three')
$combo.Location = New-Object System.Drawing.Point(460, 50); $combo.Size = New-Object System.Drawing.Size(120, 24)
$form.Controls.Add($combo)

$btnModal = New-Object System.Windows.Forms.Button
$btnModal.Name = 'OpenModalButton'; $btnModal.Text = 'Open Modal'
$btnModal.Location = New-Object System.Drawing.Point(460, 84); $btnModal.Size = New-Object System.Drawing.Size(120, 28)
$form.Controls.Add($btnModal)

$tabs = New-Object System.Windows.Forms.TabControl
$tabs.Name = 'Tabs'; $tabs.AccessibleName = 'Tabs'
$tabs.Location = New-Object System.Drawing.Point(16, 130); $tabs.Size = New-Object System.Drawing.Size(320, 120)
$pageA = New-Object System.Windows.Forms.TabPage; $pageA.Text = 'Tab A'; $pageA.Name = 'TabA'
$pageB = New-Object System.Windows.Forms.TabPage; $pageB.Text = 'Tab B'; $pageB.Name = 'TabB'
$pageA.Controls.Add((NewLabel 'TabAContent' 'Tab A content' 10 10 200))
$pageB.Controls.Add((NewLabel 'TabBContent' 'Tab B content' 10 10 200))
[void]$tabs.TabPages.Add($pageA); [void]$tabs.TabPages.Add($pageB)
$form.Controls.Add($tabs)

# ── CustomRows: 직접 그린 목록(행은 UIA 자식이 아니다) ───────────────────────
$form.Controls.Add((NewLabel 'CaptionCustom' 'Custom rows (drawn, not exposed):' 360 130 300))
$custom = New-Object System.Windows.Forms.Panel
$custom.Name = 'CustomRows'; $custom.AccessibleName = 'CustomRows'
$custom.AccessibleRole = [System.Windows.Forms.AccessibleRole]::List
$custom.Location = New-Object System.Drawing.Point(360, 150); $custom.Size = New-Object System.Drawing.Size(320, 100)
$custom.BorderStyle = 'FixedSingle'; $custom.BackColor = [System.Drawing.Color]::White
$ROW_H = 30
$custom.Add_Paint({
    $e = $_
    $font = New-Object System.Drawing.Font('Segoe UI', 10)
    for ($i = 0; $i -lt 3; $i++) {
        $y = $i * $ROW_H
        $e.Graphics.DrawLine([System.Drawing.Pens]::LightGray, 0, $y + $ROW_H, 320, $y + $ROW_H)
        $e.Graphics.DrawString(('Row ' + ($i + 1)), $font, [System.Drawing.Brushes]::Black, 8, $y + 6)
    }
    $font.Dispose()
})
$form.Controls.Add($custom)

# ── 상태 Label(UIA Text) — 재관찰로 읽는 결과 ──────────────────────────────
$lblText = NewLabel 'StatusText' 'Current text: (empty)' 16 270 680
$lblSelected = NewLabel 'StatusSelected' 'Selected item: (none)' 16 294 680
$lblCheck = NewLabel 'StatusCheck' 'Checkbox: off' 16 318 680
$lblCombo = NewLabel 'StatusCombo' 'Combo: (none)' 16 342 680
$lblTab = NewLabel 'StatusTab' 'Active tab: Tab A' 16 366 680
$lblAction = NewLabel 'StatusAction' 'Last action: (none)' 16 390 680
$lblSubmit = NewLabel 'StatusSubmit' 'Last submitted: (none)' 16 414 680
$lblCustom = NewLabel 'StatusCustom' 'Custom row: (none)' 16 438 680
foreach ($l in @($lblText, $lblSelected, $lblCheck, $lblCombo, $lblTab, $lblAction, $lblSubmit, $lblCustom)) { $form.Controls.Add($l) }
$form.Controls.Add((NewLabel 'Footer' 'O4O UIA canonical test surface - synthetic values only, no external side effects.' 16 520 680))

# ── 동작(모두 화면 내부 상태 변경뿐) ────────────────────────────────────────
$tb.Add_TextChanged({ if ($tb.Text.Length -eq 0) { $lblText.Text = 'Current text: (empty)' } else { $lblText.Text = 'Current text: ' + $tb.Text } })
$btnAction.Add_Click({ $script:actionCount++; $lblAction.Text = 'Last action: Action #' + $script:actionCount })
$btnSubmit.Add_Click({
    if ($tb.Text.Length -eq 0) { $lblSubmit.Text = 'Last submitted: (empty)' } else { $lblSubmit.Text = 'Last submitted: ' + $tb.Text }
    $tb.Clear()
})
$lb.Add_SelectedIndexChanged({ if ($null -ne $lb.SelectedItem) { $lblSelected.Text = 'Selected item: ' + $lb.SelectedItem } })
$cb.Add_CheckedChanged({ if ($cb.Checked) { $lblCheck.Text = 'Checkbox: on' } else { $lblCheck.Text = 'Checkbox: off' } })
$cbTitle.Add_CheckedChanged({ if ($cbTitle.Checked) { $form.Text = $TITLE + ' *' } else { $form.Text = $TITLE } })
$combo.Add_SelectedIndexChanged({ if ($null -ne $combo.SelectedItem) { $lblCombo.Text = 'Combo: ' + $combo.SelectedItem } })
$tabs.Add_SelectedIndexChanged({ $lblTab.Text = 'Active tab: ' + $tabs.SelectedTab.Text })
$custom.Add_MouseClick({
    $e = $_
    $row = [int][Math]::Floor($e.Y / $ROW_H) + 1
    if ($row -ge 1 -and $row -le 3) { $lblCustom.Text = 'Custom row: Row ' + $row }
})
$btnModal.Add_Click({
    # 클릭 핸들러는 즉시 돌아온다(UIA Invoke 가 모달 루프에 묶이지 않게) — 모달은 다음 메시지 루프 차례에 뜬다.
    [void]$form.BeginInvoke([System.Action]{
        $modal = New-Object System.Windows.Forms.Form
        $modal.Text = $TITLE + ' - Modal'; $modal.Name = 'O4OTestSurfaceModal'
        $modal.Size = New-Object System.Drawing.Size(320, 160); $modal.StartPosition = 'CenterParent'; $modal.FormBorderStyle = 'FixedDialog'
        $modal.MinimizeBox = $false; $modal.MaximizeBox = $false
        $modal.Controls.Add((NewLabel 'ModalText' 'Modal open' 16 16 200))
        $close = New-Object System.Windows.Forms.Button
        $close.Name = 'ModalCloseButton'; $close.Text = 'Close'
        $close.Location = New-Object System.Drawing.Point(100, 70); $close.Size = New-Object System.Drawing.Size(100, 28)
        $close.DialogResult = [System.Windows.Forms.DialogResult]::OK
        $modal.Controls.Add($close); $modal.AcceptButton = $close; $modal.CancelButton = $close
        $lblAction.Text = 'Last action: modal open'
        [void]$modal.ShowDialog($form)
        $modal.Dispose()
        $lblAction.Text = 'Last action: modal closed'
    })
})

[void]$form.ShowDialog()
