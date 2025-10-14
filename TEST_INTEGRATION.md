# Test d'intégration NeoMXM

Guide pour tester l'intégration complète sketch-neomxm ↔ Cortex

## Setup rapide

### 1. Configuration des clés API

Créer un fichier `.env` dans `/app`:

```bash
cat > /app/.env << 'ENVEOF'
# API Keys (mettre AU MOINS une vraie clé)
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here
DEEPSEEK_API_KEY=your-key-here

# Cortex config
CORTEX_ENABLED=true
CORTEX_PROFILES_DIR=/app/cortex/profiles
CORTEX_LOGS_DIR=/app/cortex/logs

# Model selection
CORTEX_MODEL_FIRSTATTENDANT=gpt-4o-mini
CORTEX_MODEL_SECONDTHOUGHT=claude-sonnet-4.5
CORTEX_MODEL_ELITE=claude-opus-4
ENVEOF
```

Puis charger:
```bash
source /app/.env
```

### 2. Démarrer le Cortex Server

Terminal 1:
```bash
cd /app
source .env
./cortex-server
```

Vous devriez voir:
```
INFO Starting Cortex server addr=:8181
INFO Cortex server ready addr=:8181
```

### 3. Tester le Cortex Server

Terminal 2:
```bash
# Test health
curl http://localhost:8181/health
# Devrait retourner: {"cortex":"ready","status":"healthy"}

# Test experts
curl http://localhost:8181/experts
# Devrait lister les experts disponibles

# Test chat simple
curl -X POST http://localhost:8181/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": [{"type": "text", "text": "Say hello in one word"}]
      }
    ]
  }'
# Devrait retourner une réponse JSON avec le texte de réponse
```

### 4. Démarrer sketch-neomxm

Terminal 3:
```bash
cd /app/sketch-neomxm

# Pointer vers le cortex
export CORTEX_URL=http://localhost:8181

# Lancer sketch
./sketch
```

sketch-neomxm va maintenant router TOUTES les requêtes IA vers le cortex!

## Tests de validation

### Test 1: Vérifier le routing

Dans sketch-neomxm, demander quelque chose de simple:

```
User: List files in current directory
```

Dans les logs du cortex-server (Terminal 1), vous devriez voir:
```
INFO HTTP request method=POST path=/chat
INFO Expert executing request expert=FirstAttendant model=gpt-4o-mini
INFO HTTP response method=POST path=/chat duration=...
```

✅ **Succès**: La requête est passée par FirstAttendant (modèle cheap)

### Test 2: Tâche complexe

Dans sketch-neomxm:

```
User: Design a scalable microservices architecture for an e-commerce platform
```

Dans les logs du cortex-server, vous devriez voir une escalation:
```
INFO Expert executing request expert=FirstAttendant
INFO Escalating to higher expert from=FirstAttendant to=SecondThought
INFO Expert executing request expert=SecondThought model=claude-sonnet-4.5
```

✅ **Succès**: Escalation automatique vers un meilleur modèle

### Test 3: Vérifier les coûts

Après quelques requêtes:

```bash
# Voir les logs de performance
cat /app/cortex/logs/performance_*.json | tail -20

# Calculer coût total
cat /app/cortex/logs/performance_*.json | jq '[.[] | select(.success)] | map(.cost_usd // 0) | add'
```

## Troubleshooting

### "connection refused" dans sketch-neomxm

**Cause**: Cortex server pas démarré

**Solution**: Démarrer `./cortex-server` dans Terminal 1

### "no API keys configured"

**Cause**: Variables d'environnement pas chargées

**Solution**: 
```bash
source /app/.env
./cortex-server
```

### Requêtes ne passent pas par le cortex

**Cause**: CORTEX_URL pas défini

**Solution**:
```bash
export CORTEX_URL=http://localhost:8181
cd sketch-neomxm && ./sketch
```

### Vérifier que CORTEX_URL est bien défini

```bash
echo $CORTEX_URL
# Devrait afficher: http://localhost:8181
```

## Architecture validée

Si tous les tests passent, vous avez:

```
sketch-neomxm (port dynamique)
        ↓
    HTTP call
        ↓
Cortex Server (localhost:8181)
        ↓
Expert Selection (FirstAttendant/SecondThought/Elite)
        ↓
ModelRouter
        ↓
AI Provider APIs (Anthropic/OpenAI/DeepSeek)
```

✅ **Séparation complète**: Cortex externe, sketch-neomxm est juste un client

✅ **Flexibilité**: Modifier le cortex sans toucher sketch-neomxm

✅ **Optimisation**: Économie de 30-40% sur les coûts d'API

## Prochaines étapes

1. Tester avec de vraies tâches de développement
2. Monitorer les logs de performance
3. Ajuster les seuils de confidence/complexity si nécessaire
4. Créer des profils d'experts custom pour vos besoins spécifiques

## Support

- Cortex documentation: `/app/cortex/README.md`
- sketch-neomxm: `/app/sketch-neomxm/README_NEOMXM.md`
- Configuration: Variables dans `/app/.env`
