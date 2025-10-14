# Configuration Cortex pour Sketch-NeoMXM

## Vue d'ensemble

Sketch-NeoMXM peut router toutes ses requêtes LLM à travers un serveur Cortex au lieu de parler directement à Anthropic, OpenAI, ou d'autres providers.

## Architecture

```
┌─────────────────┐
│ sketch-neomxm   │
│ (client)        │
└────────┬────────┘
         │ HTTP
         │ (CORTEX_URL)
         ▼
┌─────────────────┐
│ cortex-server   │
│ (port 8181)     │
└────────┬────────┘
         │
         ├─► Anthropic API
         ├─► OpenAI API  
         └─► DeepSeek API
```

## Démarrage du serveur Cortex

### 1. Configurer les variables d'environnement

Créez un fichier `.env` avec vos clés API:

```bash
# API Keys pour les différents providers
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=sk-xxx

# Configuration Cortex
CORTEX_ENABLED=true
CORTEX_PROFILES_DIR=cortex/profiles
CORTEX_LOGS_DIR=cortex/logs
```

### 2. Démarrer le serveur

```bash
cd /app
source .env  # ou utilisez un outil comme direnv
go run cortex/cmd/cortex-server/main.go -addr :8181
```

Le serveur écoute maintenant sur `http://localhost:8181`

### 3. Vérifier que le serveur fonctionne

```bash
curl http://localhost:8181/health
# {"status":"healthy","cortex":"ready"}

curl http://localhost:8181/experts
# Liste des experts disponibles
```

## Configuration de Sketch-NeoMXM

### Option 1: Variable d'environnement

```bash
export CORTEX_URL=http://localhost:8181
cd /app/sketch-neomxm
./sketch -skaband-addr=""
```

### Option 2: Fichier .env

Ajoutez à votre `.env`:

```bash
CORTEX_URL=http://localhost:8181
```

Puis lancez sketch:

```bash
source .env
./sketch -skaband-addr=""
```

## Notes importantes

- **Pas besoin d'ANTHROPIC_API_KEY dans sketch-neomxm** : Quand `CORTEX_URL` est défini, sketch-neomxm ne vérifie plus les API keys locales
- **Le serveur Cortex gère les API keys** : Les clés sont configurées une seule fois dans le serveur Cortex
- **Port par défaut** : Le client Cortex utilise `http://localhost:8181` par défaut si `CORTEX_URL` n'est pas défini

## Endpoints Cortex

- `GET /health` - Vérifier l'état du serveur
- `GET /experts` - Liste des experts disponibles
- `POST /chat` - Envoyer une requête de chat (format compatible API Anthropic)

## Debugging

Activez les logs détaillés:

```bash
CORTEX_DEBUG=true go run cortex/cmd/cortex-server/main.go
```

Les logs de performance sont sauvegardés dans `cortex/logs/performance_YYYY-MM-DD.json`

## Exemple complet

### Terminal 1: Démarrer Cortex

```bash
cd /app
export ANTHROPIC_API_KEY=sk-ant-xxx
export OPENAI_API_KEY=sk-xxx
export DEEPSEEK_API_KEY=sk-xxx
export CORTEX_ENABLED=true
go run cortex/cmd/cortex-server/main.go -addr :8181
```

### Terminal 2: Utiliser Sketch-NeoMXM

```bash
cd /app/sketch-neomxm
export CORTEX_URL=http://localhost:8181
./sketch -skaband-addr=""
```

Sketch-NeoMXM va maintenant router toutes ses requêtes LLM via Cortex!
