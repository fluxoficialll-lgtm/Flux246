#!/usr/bin/env bash
# Falha imediata em qualquer erro
set -o errexit
set -o pipefail

echo "=== Iniciando Build da Plataforma Flux ==="

# 1. Instalar dependências (inclui devDependencies para o Vite)
echo "=== Instalando dependências ==="
npm install --include=dev

# 2. Limpar build antigo
echo "=== Limpando artefatos antigos ==="
rm -rf dist

# 3. Build do frontend (React + Vite)
echo "=== Compilando frontend ==="
npm run build

# 4. Verificação obrigatória
if [ ! -d "dist" ]; then
  echo "ERRO: pasta 'dist' não foi gerada. Build inválido."
  exit 1
fi

echo "=== Build finalizado com sucesso ==="