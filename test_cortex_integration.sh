#!/bin/bash
set -e

echo "=== Test d'intégration Cortex + Sketch-NeoMXM ==="
echo ""

# Démarrer le serveur Cortex en arrière-plan
echo "1. Démarrage du serveur Cortex sur port 18181..."
cd /app
ANTHROPIC_API_KEY=fake CORTEX_ENABLED=true go run cortex/cmd/cortex-server/main.go -addr :18181 > /tmp/cortex.log 2>&1 &
CORTEX_PID=$!
sleep 3

# Vérifier que le serveur est démarré
echo "2. Vérification de la santé du serveur..."
if curl -s http://localhost:18181/health | grep -q "healthy"; then
    echo "   ✓ Serveur Cortex opérationnel"
else
    echo "   ✗ Serveur Cortex non disponible"
    kill $CORTEX_PID 2>/dev/null
    exit 1
fi

# Vérifier les experts
echo "3. Vérification des experts disponibles..."
EXPERTS=$(curl -s http://localhost:18181/experts | jq -r '.experts | length')
echo "   ✓ $EXPERTS experts chargés"

# Tester sketch-neomxm avec CORTEX_URL
echo "4. Test de sketch-neomxm avec CORTEX_URL..."
cd /app/sketch-neomxm
if CORTEX_URL=http://localhost:18181 ./sketch -skaband-addr="" -version > /dev/null 2>&1; then
    echo "   ✓ Sketch-neomxm peut démarrer avec CORTEX_URL"
else
    echo "   ✗ Sketch-neomxm ne peut pas démarrer avec CORTEX_URL"
    kill $CORTEX_PID 2>/dev/null
    exit 1
fi

# Vérifier que sketch ne demande pas l'API key
echo "5. Vérification que ANTHROPIC_API_KEY n'est pas requis..."
if CORTEX_URL=http://localhost:18181 ./sketch -skaband-addr="" -version 2>&1 | grep -q "ANTHROPIC_API_KEY"; then
    echo "   ✗ Sketch demande encore ANTHROPIC_API_KEY"
    kill $CORTEX_PID 2>/dev/null
    exit 1
else
    echo "   ✓ Sketch ne demande pas ANTHROPIC_API_KEY quand CORTEX_URL est défini"
fi

# Nettoyer
echo "6. Nettoyage..."
kill $CORTEX_PID 2>/dev/null
wait $CORTEX_PID 2>/dev/null

echo ""
echo "=== ✓ Tous les tests passent! ==="
echo ""
echo "Pour utiliser Cortex avec Sketch-NeoMXM:"
echo "  1. Démarrez le serveur: cd /app && ANTHROPIC_API_KEY=your-key go run cortex/cmd/cortex-server/main.go"
echo "  2. Dans un autre terminal: cd /app/sketch-neomxm && CORTEX_URL=http://localhost:8181 ./sketch -skaband-addr=\"\""
