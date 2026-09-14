@echo off
chcp 65001 >nul
title YouTube Music Downloader
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     YOUTUBE MUSIC DOWNLOADER             ║
echo  ╚══════════════════════════════════════════╝
echo.

:menu
echo  [1] Baixar música (URL)
echo  [2] Baixar playlist
echo  [3] Sair
echo.
set /p choice="Escolha uma opção: "

if "%choice%"=="1" goto single
if "%choice%"=="2" goto playlist
if "%choice%"=="3" exit
goto menu

:single
echo.
set /p url="Cole a URL do YouTube: "
echo.
echo  Baixando...
yt-dlp -x --audio-format mp3 --audio-quality 0 -o "%%(title)s.%%(ext)s" "%url%"
echo.
echo  Concluído! Arquivo salvo na pasta atual.
pause
goto menu

:playlist
echo.
set /p url="Cole a URL da playlist: "
echo.
echo  Baixando playlist...
yt-dlp -x --audio-format mp3 --audio-quality 0 -o "%%(playlist)s/%%(title)s.%%(ext)s" "%url%"
echo.
echo  Concluído! Arquivos salvos na pasta atual.
pause
goto menu