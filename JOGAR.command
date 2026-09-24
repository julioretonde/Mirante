#!/bin/bash
# Duplo clique para jogar Ascenda (macOS).
cd "$(dirname "$0")" || exit 1

# O Node instalado pelo Homebrew ou pelo nvm pode não estar no PATH de um
# clique duplo no Finder; adicionamos os caminhos mais comuns.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
fi

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  O Node.js não está instalado neste computador."
  echo "  Instale a versão LTS em https://nodejs.org e dê um duplo clique aqui de novo."
  echo ""
  open "https://nodejs.org"
  read -n 1 -s -r -p "  Pressione qualquer tecla para fechar..."
  exit 1
fi

npm start
