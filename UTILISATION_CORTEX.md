# Guide d'utilisation : Sketch-NeoMXM avec Cortex

## Ce qui a été fait

J'ai modifié sketch-neomxm pour qu'il puisse utiliser votre serveur Cortex au lieu de parler directement à Anthropic. 

**Changements:**
1. Skip la vérification de `ANTHROPIC_API_KEY` quand `CORTEX_URL` est défini
2. Le client Cortex existant (`llm/cortex/cortex_client.go`) est déjà utilisé automatiquement
3. Documentation complète dans `sketch-neomxm/CORTEX_SETUP.md`
4. Script de test d'intégration: `test_cortex_integration.sh`

## Comment utiliser

### Étape 1: Démarrer le serveur Cortex

Dans un terminal (sur votre machine WSL ou dans un container):

```bash
cd /app

# Configurer vos API keys
export ANTHROPIC_API_KEY=sk-ant-your-real-key
export OPENAI_API_KEY=sk-your-real-key
export DEEPSEEK_API_KEY=sk-your-real-key
export CORTEX_ENABLED=true

# Démarrer le serveur
go run cortex/cmd/cortex-server/main.go -addr :8181
```

Le serveur écoute maintenant sur `http://localhost:8181`

### Étape 2: Utiliser Sketch-NeoMXM

Dans un autre terminal:

```bash
cd /app/sketch-neomxm

# Pointer vers le serveur Cortex
export CORTEX_URL=http://localhost:8181

# Lancer sketch (pas besoin d'ANTHROPIC_API_KEY!)
./sketch -skaband-addr=""
```

## Avantages

✅ **Une seule configuration d'API keys** - Toutes les clés sont dans le serveur Cortex  
✅ **Pas de redémarrage de container** - Vous pouvez modifier Cortex pendant que sketch tourne  
✅ **Routing intelligent** - Cortex choisit le meilleur modèle selon la complexité  
✅ **Logs centralisés** - Performance tracking dans `cortex/logs/`  

## Architecture

```
┌──────────────────────────────────────────┐
│  Votre machine WSL / Container           │
│                                          │
│  ┌────────────────┐                     │
│  │ Cortex Server  │                     │
│  │ :8181          │                     │
│  └───────┬────────┘                     │
│          │                               │
│          ├─► Anthropic (clé configurée) │
│          ├─► OpenAI    (clé configurée) │
│          └─► DeepSeek  (clé configurée) │
└──────────────────────────────────────────┘
           ▲
           │ HTTP (CORTEX_URL)
           │
┌──────────┴────────────┐
│  sketch-neomxm        │
│  Container            │
│  (pas d'API key!)     │
└───────────────────────┘
```

## Fichier .env recommandé

Créez `/app/.env`:

```bash
# API Keys (pour Cortex serveur uniquement)
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=sk-xxx

# Cortex config
CORTEX_ENABLED=true
CORTEX_URL=http://localhost:8181
CORTEX_PROFILES_DIR=cortex/profiles
CORTEX_LOGS_DIR=cortex/logs

# Optional: Debug
# CORTEX_DEBUG=true
```

Puis utilisez:
```bash
source /app/.env
```

## Tester l'intégration

```bash
/app/test_cortex_integration.sh
```

Ce script vérifie que:
- Le serveur Cortex démarre correctement
- Les experts sont chargés
- Sketch-neomxm peut se connecter
- Pas de demande d'API key

## Troubleshooting

### "ANTHROPIC_API_KEY environment variable is not set"

→ Assurez-vous que `CORTEX_URL` est bien défini:
```bash
echo $CORTEX_URL  # doit afficher http://localhost:8181
```

### "cortex request failed: connection refused"

→ Le serveur Cortex n'est pas démarré ou pas accessible:
```bash
curl http://localhost:8181/health
```

### Logs Cortex

Les logs détaillés sont dans:
- Console: logs en temps réel
- `cortex/logs/performance_YYYY-MM-DD.json`: métriques de performance

## Next Steps

1. **Tester avec une vraie API key** dans le serveur Cortex
2. **Configurer les profiles** dans `cortex/profiles/` si besoin
3. **Monitorer les coûts** via les logs de performance

Voir `sketch-neomxm/CORTEX_SETUP.md` pour plus de détails!
