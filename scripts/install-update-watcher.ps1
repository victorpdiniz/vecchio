# Registra a tarefa do Agendador de Tarefas do Windows que roda
# scripts/vecchio-update-watcher.sh a cada minuto via Git Bash, seguindo a
# branch "dev" (o padrao do backend, UPDATE_BRANCH em backend/.env) -
# equivalente Windows do "crontab -e" descrito em docs/self-update-setup.md.
#
# Uso: abra o PowerShell (nao precisa ser administrador, a nao ser que sua
# conta exija privilegio elevado pra rodar o Docker) dentro da pasta do
# projeto e rode:
#
#   .\scripts\install-update-watcher.ps1
#
# E idempotente: pode rodar de novo (por exemplo depois de mover o
# repositorio) que ele substitui a tarefa existente em vez de duplicar.

$ErrorActionPreference = 'Stop'

$TaskName = 'VecchioUpdateWatcher'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$WatcherScript = Join-Path $RepoRoot 'scripts\vecchio-update-watcher.sh'

if (-not (Test-Path $WatcherScript)) {
    throw "Nao encontrei $WatcherScript - rode este script de dentro do checkout do Vecchio (pasta scripts\ precisa existir ao lado dele)."
}

# Git for Windows instala o bash.exe sempre no mesmo lugar por padrao;
# cai pro PATH (ex: instalacao custom) se nao achar nesses caminhos.
$bashCandidates = @(
    (Join-Path $env:ProgramFiles 'Git\bin\bash.exe')
)
if (${env:ProgramFiles(x86)}) {
    $bashCandidates += (Join-Path ${env:ProgramFiles(x86)} 'Git\bin\bash.exe')
}
$bashPath = $bashCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $bashPath) {
    $cmd = Get-Command bash.exe -ErrorAction SilentlyContinue
    if ($cmd) { $bashPath = $cmd.Source }
}
if (-not $bashPath) {
    throw "Nao encontrei o bash.exe do Git Bash. Instale o Git for Windows (https://git-scm.com/download/win) ou ajuste `$bashCandidates neste script com o caminho certo."
}

Write-Host "Git Bash encontrado em: $bashPath"
Write-Host "Repositorio: $RepoRoot"
Write-Host "Script do watcher: $WatcherScript"
Write-Host "(sem janela de terminal: a tarefa chama o script por um lancador oculto gerado em .git\vecchio-update-watcher-hidden.vbs)"

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Tarefa '$TaskName' ja existe - removendo para recriar."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# --login: sem isso o Agendador de Tarefas chama o bash.exe sem passar pelo
# /etc/profile que monta o ambiente MINGW64 (inclusive o PATH com as pastas
# que o Docker Desktop registrou) - com --login, roda igual ao Git Bash
# aberto manualmente.
$bashCommandLine = "`"$bashPath`" --login `"$WatcherScript`""

# Chamar bash.exe direto no Action faz uma janela de terminal aparecer (e
# sumir) a cada minuto - incomoda mesmo rodando rapido. -WindowStyle Hidden
# no Start-Process nao elimina o flash de forma confiavel no Agendador de
# Tarefas; o jeito que realmente nunca mostra janela nenhuma e rodar via
# WScript.Shell.Run com o estilo de janela 0 (oculta). Por isso geramos um
# .vbs pequeno (guardado dentro do .git, junto dos outros arquivos gerados
# pelo watcher) e apontamos a tarefa pra ele em vez de pro bash.exe direto.
$vbsPath = Join-Path $RepoRoot '.git\vecchio-update-watcher-hidden.vbs'
$vbsEscapedCommandLine = $bashCommandLine -replace '"', '""'
$vbsContent = @"
Set objShell = CreateObject("WScript.Shell")
objShell.Run "$vbsEscapedCommandLine", 0, True
"@
Set-Content -Path $vbsPath -Value $vbsContent -Encoding ASCII

$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "//B `"$vbsPath`""

# -RepetitionDuration ([TimeSpan]::MaxValue) parece "repetir pra sempre" mas
# gera um valor de duracao absurdamente grande que o XML do Agendador de
# Tarefas rejeita ("valor formatado incorretamente ou fora do intervalo").
# O jeito certo de dizer "repita a cada minuto, indefinidamente" (igual a
# opcao "Indefinitely" na interface grafica) e deixar Duration vazio.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 1)
$trigger.Repetition.Duration = ''
$trigger.Repetition.StopAtDurationEnd = $false

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description 'Watcher de autoatualizacao do Vecchio (branch dev), roda a cada minuto via Git Bash' `
    | Out-Null

Write-Host ""
Write-Host "Tarefa '$TaskName' registrada - roda a cada minuto, seguindo a branch 'dev'."
Write-Host "Testar agora mesmo: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Ver log do watcher: Get-Content '$RepoRoot\.git\vecchio-update-watcher.log' -Tail 20"
Write-Host "Remover a tarefa:   Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
