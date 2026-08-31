# =============================================================================
# uia-check.ps1 - чёрноящичная UI-проверка MvvmBoard (WPF) через UI Automation.
#
# Запуск:      pwsh -File uia-check.ps1        (из этой папки)
# Перед этим:  dotnet build                    (скрипт НЕ собирает проект сам)
#
# Что делает: поднимает bin\Debug\net9.0-windows\MvvmBoard.exe и прогоняет
# gherkin-lite сценарий из gherkin.md в 9 шагов:
#   доска B1 -> пользователи Анна+Борис -> сид EPIC -> задача вручную ->
#   поиск -> каскадное удаление эпика -> удаление пользователя с переносом ->
#   полный сброс словом СБРОС.
#
# Куда смотреть при падении:
#   1. Лог прогона:       %TEMP%\uia-check-mvvmboard.log  (перезаписывается)
#   2. Лог приложения:    %TEMP%\kanban-errors\wpf.log
#      - строки без TRACE = необработанные исключения (стек внутри);
#      - строки TRACE = breadcrumbs: открытие диалога задачи и состояние
#        привязки кнопки «Сохранить», вызовы TaskEdit.Save.
#
# Особенности кликов именно в WPF:
#  - InvokePattern надёжен: команда уходит через Dispatcher асинхронно,
#    модалки открываются без блокировки вызова, foreground не нужен
#    (SetForegroundWindow из фонового процесса Windows часто ОТКЛОНЯЕТ,
#    и реальные клики мыши тогда уходят чужому окну поверх);
#  - Invoke у WPF-кнопки срабатывает даже на IsEnabled=false - фильтруем сами;
#  - TextBox пушит текст в VM по LostFocus: после SetValue переводим фокус
#    на следующее поле, иначе «Сохранить» видит пустой заголовок.
# =============================================================================

$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes

# --- user32: перечисление окон (нужно для поиска модалок) и мышь как fallback ---
Add-Type -Namespace Native -Name Mouse -MemberDefinition @"
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, System.UIntPtr extra);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr hWnd);
public delegate bool EnumProc(System.IntPtr h, System.IntPtr l);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, System.IntPtr l);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(System.IntPtr h, out uint pid);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool IsWindowVisible(System.IntPtr h);
public static System.Collections.Generic.List<System.IntPtr> WindowsOfPid(int targetPid) {
  var res = new System.Collections.Generic.List<System.IntPtr>();
  EnumWindows(delegate(System.IntPtr h, System.IntPtr l) {
    uint pid; GetWindowThreadProcessId(h, out pid);
    if (pid == (uint)targetPid && IsWindowVisible(h)) res.Add(h);
    return true;
  }, System.IntPtr.Zero);
  return res;
}
"@

function Invoke-El($el) {
  # WPF: сначала InvokePattern (см. шапку), при его отсутствии - мышь.
  if (-not $el.Current.IsEnabled) { throw 'элемент недоступен (IsEnabled=false)' }
  try {
    ($el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)).Invoke()
    return
  } catch { }   # у элемента нет Invoke (например строка списка) - падаем на мышь
  $r = $el.Current.BoundingRectangle
  $x = [int]($r.X + $r.Width / 2); $y = [int]($r.Y + $r.Height / 2)
  [void][Native.Mouse]::SetCursorPos($x, $y)
  Start-Sleep -Milliseconds 80
  [Native.Mouse]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)   # LEFTDOWN
  [Native.Mouse]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)   # LEFTUP
}

$logPath = Join-Path $env:TEMP 'uia-check-mvvmboard.log'
$exe = Join-Path $PSScriptRoot 'bin\Debug\net9.0-windows\MvvmBoard.exe'
if (-not (Test-Path $exe)) { Write-Host "нет $exe - сначала dotnet build"; exit 1 }

$script:Fails = 0
function Log($msg) { Add-Content -Path $logPath -Value $msg -Encoding UTF8 }

# ---------- базовые UIA-хелперы ----------
function Get-WindowsOf([int]$procId) {
  # ВНИМАНИЕ: RootElement.FindAll(ProcessId) может давать UIA_E_TIMEOUT -
  # EnumWindows + FromHandle работает мгновенно и надёжно.
  [Native.Mouse]::WindowsOfPid($procId) | ForEach-Object {
    try { [System.Windows.Automation.AutomationElement]::FromHandle($_) } catch { $null }
  } | Where-Object { $_ }
}
function Get-MainWin([int]$procId) {
  (Get-WindowsOf $procId | Sort-Object { $_.Current.BoundingRectangle.Width * $_.Current.BoundingRectangle.Height } -Descending)[0]
}
function Get-Els($win) { @($win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)) }
function Get-Buttons($win) { @(Get-Els $win | Where-Object { $_.Current.ControlType.ProgrammaticName -eq 'ControlType.Button' }) }
function Get-Edits($win)   { @(Get-Els $win | Where-Object { $_.Current.ControlType.ProgrammaticName -eq 'ControlType.Edit' }) }
function Get-Texts($win)   { @(Get-Els $win | Where-Object { $_.Current.ControlType.ProgrammaticName -eq 'ControlType.Text' }) }
function Set-TextEl($el, [string]$value) {
  ($el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)).SetValue($value)
}
function Click-BtnByName($win, [string]$name) {
  $b = Get-Buttons $win | Where-Object { $_.Current.Name -eq $name -and $_.Current.IsEnabled } | Select-Object -First 1
  if (-not $b) { throw "кнопка '$name' не найдена/недоступна" }
  Invoke-El $b
}
function Click-OkBtn($win) {
  $b = Get-Buttons $win | Where-Object { $_.Current.Name -in @('ОК', 'OK') -and $_.Current.IsEnabled } | Select-Object -First 1
  if (-not $b) { Dump-Dialog $win 'кнопка ОК не найдена'; throw 'кнопка ОК не найдена/недоступна' }
  Invoke-El $b
}
function Wait-Gone($winRef, [int]$timeoutMs = 4000) {
  $t0 = [DateTime]::Now
  while (((Get-Date) - $t0).TotalMilliseconds -lt $timeoutMs) {
    $still = Get-WindowsOf $winRef.Current.ProcessId | Where-Object { $_.Current.NativeWindowHandle -eq $winRef.Current.NativeWindowHandle }
    if (-not $still) { return $true }
    Start-Sleep -Milliseconds 100
  }
  return $false
}
function Wait-True([scriptblock]$cond, [int]$timeoutMs = 3000, [int]$stepMs = 200) {
  # детерминированное ожидание условия вместо фиксированных пауз
  $t0 = [DateTime]::Now
  while (((Get-Date) - $t0).TotalMilliseconds -lt $timeoutMs) {
    if (& $cond) { return $true }
    Start-Sleep -Milliseconds $stepMs
  }
  return (& $cond)
}
function Find-ModalByTitle([int]$mainHwnd, [string]$pattern, [int]$timeoutMs = 5000, [string]$excludePattern = '') {
  # ждём окно ПО ЗАГОЛОВКУ: слепой «любое не-main» ловит гонки, когда прошлое
  # модальное окно ещё закрывается, и все дальнейшие шаги бьют по чужому окну
  $t0 = [DateTime]::Now
  while (((Get-Date) - $t0).TotalMilliseconds -lt $timeoutMs) {
    foreach ($w in (Get-WindowsOf $script:AppPid)) {
      $h = $w.Current.NativeWindowHandle
      if ($h -eq 0 -or $h -eq $mainHwnd) { continue }
      $n = $w.Current.Name
      if ($excludePattern -and $n -like $excludePattern) { continue }
      if ($n -like $pattern) { return $w }
    }
    Start-Sleep -Milliseconds 150
  }
  return $null
}
function Dump-Dialog($win, [string]$tag) {
  Log "  дамп [$tag]:"
  foreach ($e in (Get-Els $win)) {
    $c = $e.Current
    if ($c.ControlType.ProgrammaticName -match 'Button|Edit|ListItem|ComboBox') {
      $sel = ''
      try {
        $sp = $e.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
        $sel = " sel=$($sp.Current.IsSelected)"
      } catch { }
      Log "    [$($c.ControlType.ProgrammaticName.Replace('ControlType.',''))] '$($c.Name)' en=$($c.IsEnabled)$sel"
    }
  }
}
function Get-StateSummary($win) {
  $lines = @()
  foreach ($t in (Get-Texts $win)) {
    $n = $t.Current.Name
    if ($n -match '\(\d+\)|^\[|EPIC|TASK|Доска|задач') { $lines += '  state: ' + ($n -replace "`r`n", ' ') }
  }
  if (-not $lines) { $lines += '  state: <текстовых индикаторов нет>' }
  return $lines
}
function Watch-ErrorWindows([int]$procId, [string]$stepName) {
  # ГЛАВНОЕ ОКНО НЕ СКАНИРУЕМ: под открытой модалкой его дерево может
  # заблокировать UIA-вызов.
  foreach ($w in (Get-WindowsOf $procId)) {
    $c = $w.Current
    if ($c.NativeWindowHandle -eq $script:MainHwnd) { continue }
    try {
      $texts = (@(Get-Els $w | ForEach-Object { $_.Current.Name }) -join ' | ')
      if ($c.Name -match 'Exception|Ошибка' -or $texts -match 'Exception|необработан|Unhandled|stack trace') {
        Log "!!! ERROR-DIALOG на шаге '$stepName': title='$($c.Name)'"
        Log "    тексты: $($texts.Substring(0, [Math]::Min(500, $texts.Length)))"
        try { ($w.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)).Close() } catch {}
        Start-Sleep -Milliseconds 300
      }
    } catch { }
  }
}
function Step([string]$name, [scriptblock]$body) {
  Log "--- STEP: $name"
  try { & $body; Log '    ok'; Write-Host "ok   $name" }
  catch { $script:Fails++; Log "    FAIL: $($_.Exception.Message)"; Write-Host "FAIL $name : $($_.Exception.Message)" -ForegroundColor Red }
  finally {
    Start-Sleep -Milliseconds 250
    Watch-ErrorWindows $script:AppPid $name
  }
}

# ---------- запуск приложения ----------
Remove-Item $logPath -ErrorAction SilentlyContinue
Log "=== запуск MvvmBoard: $exe ==="
$p = Start-Process -FilePath $exe -PassThru
$script:AppPid = $p.Id
try { $null = $p.WaitForInputIdle(10000) } catch {}
Start-Sleep -Seconds 5

$main = Get-MainWin $script:AppPid
if (-not $main) { Log 'FATAL: главного окна нет'; Write-Host 'FATAL: главного окна нет (см. лог)' -ForegroundColor Red; exit 1 }
Log "главное окно: '$($main.Current.Name)'"
$script:MainHwnd = $main.Current.NativeWindowHandle
$mainHwnd = $script:MainHwnd

# =============================================================================
# СЦЕНАРИЙ
# =============================================================================

Step 'создать доску «B1»' {
  Click-BtnByName $main '+ Доска'
  $dlg = Find-ModalByTitle $mainHwnd '*'
  if (-not $dlg) { throw 'модалка ввода не открылась' }
  Start-Sleep -Milliseconds 250
  $edit = Get-Edits $dlg | Select-Object -First 1
  Set-TextEl $edit 'B1'
  Click-OkBtn $dlg
  if (-not (Wait-Gone $dlg)) { throw 'модалка не закрылась' }
}

Step 'доска появилась в интерфейсе' {
  Start-Sleep -Milliseconds 400
  Log ((Get-StateSummary (Get-MainWin $script:AppPid)) -join "`n")
}

Step 'добавить пользователей Анна и Борис' {
  Click-BtnByName (Get-MainWin $script:AppPid) 'Пользователи'
  $dlg = Find-ModalByTitle $mainHwnd 'Пользователи*'
  if (-not $dlg) { throw 'окно пользователей не открылось' }
  Start-Sleep -Milliseconds 350
  foreach ($name in @('Анна', 'Борис')) {
    $edit = Get-Edits $dlg | Select-Object -Last 1
    Set-TextEl $edit $name
    Click-BtnByName $dlg 'Добавить'
    Start-Sleep -Milliseconds 350
  }
  Log ('  пользователи в списке: ' +
    (@(Get-Els $dlg | Where-Object { $_.Current.ControlType.ProgrammaticName -eq 'ControlType.ListItem' } |
        ForEach-Object { $_.Current.Name }) -join ', '))
  ($dlg.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)).Close()
  if (-not (Wait-Gone $dlg)) { throw 'окно пользователей не закрылось' }
}

Step 'сид тестового эпика (+5 задач)' {
  Click-BtnByName (Get-MainWin $script:AppPid) 'Тест-эпик 🧪'
  Start-Sleep -Milliseconds 900
  Log ((Get-StateSummary (Get-MainWin $script:AppPid)) -join "`n")
}

Step 'создать задачу вручную из первой колонки' {
  $m = Get-MainWin $script:AppPid
  $plus = Get-Buttons $m | Where-Object { $_.Current.Name -eq '+ Задача' -and $_.Current.IsEnabled } | Select-Object -First 1
  if (-not $plus) { throw "кнопка '+ Задача' недоступна" }
  Invoke-El $plus
  $dlg = Find-ModalByTitle $mainHwnd '*адача*'
  if (-not $dlg) { throw 'диалог задачи не открылся' }
  Start-Sleep -Milliseconds 350
  $edits = Get-Edits $dlg
  if (-not $edits) { throw 'в диалоге задачи нет полей ввода' }
  Set-TextEl ($edits | Select-Object -First 1) 'Задача 1'
  # ЛОВУШКА WPF: TextBox пушит текст в VM по LostFocus. Переводим фокус на
  # следующее поле, иначе «Сохранить» увидит пустой заголовок (валидация).
  try { ($edits | Select-Object -Skip 1 -First 1).Focus() } catch { }
  Start-Sleep -Milliseconds 350
  # Клик может быть молча проглочен рассинхроном requery/CanExecute -
  # лечится повторами с проверкой результата.
  $saved = $false
  for ($i = 0; $i -lt 8 -and -not $saved; $i++) {
    try {
      $v = (($edits | Select-Object -First 1).GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)).Current.Value
      if ($v -ne 'Задача 1') {                       # кто-то очистил поле - вернём
        Set-TextEl ($edits | Select-Object -First 1) 'Задача 1'
        try { ($edits | Select-Object -Skip 1 -First 1).Focus() } catch { }
        Start-Sleep -Milliseconds 250
      }
    } catch { }
    try { Click-BtnByName $dlg 'Сохранить' } catch { Log "  попытка ${i}: клик не прошёл ($_)" }
    if (Wait-Gone $dlg 1500) { $saved = $true }
  }
  if (-not $saved) {
    # ДИАГНОСТИКА: что реально на экране в момент провала (до закрытия сироты)
    Log ('  окна процесса сейчас: ' + ((Get-WindowsOf $script:AppPid | ForEach-Object { "'$($_.Current.Name)'#h=$($_.Current.NativeWindowHandle)" }) -join ', '))
    Dump-Dialog $dlg 'диалог задачи при провале'
    # не оставляем диалог-сироту: он перехватит поиск модалок в следующих шагах
    try { ($dlg.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)).Close(); Start-Sleep -Milliseconds 400 } catch { }
    throw 'диалог задачи не закрылся после 8 попыток (валидация? см. kanban-errors\wpf.log)'
  }
  Start-Sleep -Milliseconds 400
  Log ((Get-StateSummary (Get-MainWin $script:AppPid)) -join "`n")
}

Step 'поиск «Задача 1» фильтрует колонки' {
  $m = Get-MainWin $script:AppPid
  $search = Get-Edits $m | Select-Object -First 1
  Set-TextEl $search 'Задача 1'
  Start-Sleep -Milliseconds 700                     # фильтр живёт на TextChanged
  Log ((Get-StateSummary $m) -join "`n")
  Set-TextEl $search ''
  Start-Sleep -Milliseconds 400
}

Step 'удалить эпик каскадом' {
  $m = Get-MainWin $script:AppPid
  $lists = @(Get-Els $m | Where-Object { $_.Current.ControlType.ProgrammaticName -eq 'ControlType.List' })
  $epicItem = $null
  foreach ($l in $lists) {
    $items = @($l.FindAll([System.Windows.Automation.TreeScope]::Children,
      (New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::ListItem))))
    if ($items.Count -gt 0 -and $items[0].Current.Name -match 'EPIC') { $epicItem = $items[0]; break }
  }
  if (-not $epicItem) { throw 'элемент эпика не найден' }
  ($epicItem.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)).Select()
  Start-Sleep -Milliseconds 300
  Click-BtnByName $m 'Удалить выбранный эпик'
  $dlg = Find-ModalByTitle $mainHwnd '*Удаление*'
  if (-not $dlg) { throw 'диалог удаления эпика не открылся' }
  Start-Sleep -Milliseconds 300
  # каскадная кнопка содержит «Удалить эпик и» («…и его задачи»)
  $cascade = Get-Buttons $dlg | Where-Object {
    $_.Current.Name -match 'вместе с задачами|Удалить эпик и' -and $_.Current.IsEnabled
  } | Select-Object -First 1
  if (-not $cascade) { throw 'каскадная кнопка не найдена' }
  Invoke-El $cascade
  if (-not (Wait-Gone $dlg)) { throw 'диалог удаления эпика не закрылся' }
  Start-Sleep -Milliseconds 600
  Log ((Get-StateSummary (Get-MainWin $script:AppPid)) -join "`n")
}

Step 'удалить Анну с переносом задач Борису' {
  Click-BtnByName (Get-MainWin $script:AppPid) 'Пользователи'
  $dlg = Find-ModalByTitle $mainHwnd 'Пользователи*'
  if (-not $dlg) { throw 'окно пользователей не открылось' }
  Start-Sleep -Milliseconds 350
  try {
    $anna = Get-Els $dlg | Where-Object {
      $_.Current.ControlType.ProgrammaticName -eq 'ControlType.ListItem' -and $_.Current.Name -match 'Анна'
    } | Select-Object -First 1
    if (-not $anna) { throw 'Анна не найдена в списке' }
    ($anna.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)).Select()
    Start-Sleep -Milliseconds 300
    $delBtn = Get-Buttons $dlg | Where-Object { $_.Current.Name -like 'Удалить выбран*' -and $_.Current.IsEnabled } | Select-Object -First 1
    if (-not $delBtn) { Dump-Dialog $dlg 'кнопка удаления не найдена/не активна'; throw 'кнопка удаления пользователей не доступна' }
    Invoke-El $delBtn
    Start-Sleep -Milliseconds 400
    # возможен промежуточный диалог переноса задач
    $re = Find-ModalByTitle $mainHwnd '*' 2500 'Пользователи*'
    if ($re) {
      Log ('  диалог переноса: ' + ((Get-Els $re | ForEach-Object { $_.Current.Name }) -join ' | '))
      $ok = Get-Buttons $re | Where-Object { $_.Current.Name -match 'Перенести' } | Select-Object -First 1
      if ($ok) { Invoke-El $ok } else { ($re.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)).Close() }
      Start-Sleep -Milliseconds 500
    }
  }
  finally {
    # ГАРАНТИРУЕМ закрытие окна пользователей: открытый модал блокирует
    # главное окно и валит все последующие шаги
    try { if (-not (Wait-Gone $dlg)) { ($dlg.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)).Close(); Start-Sleep -Milliseconds 400 } } catch { }
  }
  Start-Sleep -Milliseconds 500
  Log ((Get-StateSummary (Get-MainWin $script:AppPid)) -join "`n")
}

Step 'полный сброс со словом СБРОС' {
  # страховка: закрываем любые застрявшие модалки от прошлых шагов -
  # они блокируют главное окно, и клик по кнопке уходит в никуда
  foreach ($w in (Get-WindowsOf $script:AppPid)) {
    if ($w.Current.NativeWindowHandle -ne $mainHwnd) {
      try { ($w.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)).Close() } catch { }
    }
  }
  Start-Sleep -Milliseconds 500
  Click-BtnByName (Get-MainWin $script:AppPid) 'Сброс всего'
  # исключаем окна пользователей: их закрытие асинхронно, и слепой поиск
  # может схватить именно их вместо промпта подтверждения
  $dlg = Find-ModalByTitle $mainHwnd '*' 5000 'Пользователи*'
  if (-not $dlg) { throw 'диалог подтверждения не открылся' }
  Log ('  модалка: ' + $dlg.Current.Name)
  Start-Sleep -Milliseconds 300
  $edit = Get-Edits $dlg | Select-Object -First 1
  Set-TextEl $edit 'СБРОС'
  $okEnabled = Wait-True {
    $b = Get-Buttons $dlg | Where-Object { $_.Current.Name -in @('ОК', 'OK') } | Select-Object -First 1
    $b -and $b.Current.IsEnabled
  } 3000
  if (-not $okEnabled) { Log '  предупреждение: ОК не активировался за 3с, пробуем всё равно' }
  Click-OkBtn $dlg
  if (-not (Wait-Gone $dlg)) { throw 'диалог сброса не закрылся' }
  Start-Sleep -Milliseconds 600
  Log ((Get-StateSummary (Get-MainWin $script:AppPid)) -join "`n")
}

# ---------- итоги ----------
$p2 = Get-Process -Id $script:AppPid -ErrorAction SilentlyContinue
$appAlive = [bool]$p2
Log ("=== итог: шагов с ошибками: $script:Fails; процесс " + ($appAlive ? 'жив' : 'УМЕР') + ' ===')
Stop-Process -Id $script:AppPid -Force -ErrorAction SilentlyContinue

if ($script:Fails -eq 0 -and $appAlive) {
  Write-Host "`nИТОГ: все шаги ok. Лог: $logPath" -ForegroundColor Green
  exit 0
} else {
  Write-Host "`nИТОГ: есть проблемы. Лог: $logPath; ошибки приложения: $env:TEMP\kanban-errors\wpf.log" -ForegroundColor Red
  exit 1
}
