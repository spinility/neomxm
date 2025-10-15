# NeoMXM - Système de Développement IA Intelligent

NeoMXM est un système de développement avec IA qui utilise un **Cortex multi-expert** pour router intelligemment vos requêtes vers le meilleur modèle, optimisant ainsi coûts et qualité.

## 🚀 Installation et Configuration

### Prérequis

- Docker installé
- Go 1.24+ (pour build)
- Au moins une clé API (Anthropic, OpenAI, ou DeepSeek)

### Installation en 3 étapes

#### 1. Cloner le repository

```bash
git clone <votre-repo-neomxm>
cd neomxm
```

#### 2. Configurer vos clés API

**Première fois:**
```bash
./start-neomxm.sh
```

Le script créera un fichier `.env` template. Éditez-le avec vos vraies clés:

```bash
nano .env
```

Remplacez les placeholders:

```bash
# AU MOINS UNE clé API requise
ANTHROPIC_API_KEY=sk-ant-votre-vraie-clé-ici
OPENAI_API_KEY=sk-votre-vraie-clé-ici
DEEPSEEK_API_KEY=votre-vraie-clé-ici

# Configuration Cortex (laisser tel quel)
CORTEX_ENABLED=true
CORTEX_PROFILES_DIR=/app/cortex/profiles
CORTEX_LOGS_DIR=/app/cortex/logs

# Sélection des modèles (optionnel)
CORTEX_MODEL_FIRSTATTENDANT=gpt-4o-mini
CORTEX_MODEL_SECONDTHOUGHT=claude-sonnet-4.5
CORTEX_MODEL_ELITE=claude-opus-4
```

Sauvegardez et fermez.

#### 3. Lancer NeoMXM

```bash
./start-neomxm.sh
```

**C'est tout!** Le script va:
- ✅ Valider vos clés API
- ✅ Builder les binaires si nécessaire
- ✅ Démarrer le Cortex Server (port 8181)
- ✅ Lancer sketch-neomxm connecté au Cortex
- ✅ Gérer le cleanup automatiquement (Ctrl+C)

## 🎯 Utilisation

### Lancement rapide

```bash
./start-neomxm.sh
```

Tu verras:

```
╔════════════════════════════════════════╗
║     NeoMXM Startup Script              ║
╔════════════════════════════════════════╗

✓ Configuration loaded
🚀 Starting Cortex Server on port 8181...
✓ Cortex Server is ready!

🧠 Available Experts:
   - FirstAttendant (gpt-4o-mini) - Tier 1
   - SecondThought (claude-sonnet-4.5) - Tier 2
   - Elite (claude-opus-4) - Tier 3

🎨 Starting sketch-neomxm...
```

Utilise sketch-neomxm **exactement comme Sketch standard**, mais toutes tes requêtes passent maintenant par le Cortex intelligent!

### Arrêt

Appuie sur **Ctrl+C** dans le terminal. Le script arrêtera proprement:
- sketch-neomxm
- Cortex Server
- Cleanup automatique

## 📊 Comment ça fonctionne

### Architecture

```
┌─────────────────┐
│  sketch-neomxm  │  Interface de développement (client)
│   (port auto)   │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│  Cortex Server  │  Cerveau intelligent (serveur)
│  localhost:8181 │
└────────┬────────┘
         │
    ┌────┴─────┬──────────┐
    ↓          ↓          ↓
FirstAttendant SecondThought Elite
(gpt-4o-mini) (claude-4.5) (opus-4)
    ↓          ↓          ↓
  OpenAI    Anthropic  DeepSeek
```

### Routing Intelligent

**Tâche simple** (ex: "List files"):
```
Toi → sketch → Cortex → FirstAttendant (gpt-4o-mini, cheap) → OpenAI
```

**Tâche complexe** (ex: "Design architecture"):
```
Toi → sketch → Cortex → SecondThought (claude-4.5, balanced) → Anthropic
```

**Tâche difficile** (ex: "Debug complex issue"):
```
Toi → sketch → Cortex → Elite (claude-opus-4, premium) → Anthropic
```

### Bénéfices

- 💰 **30-40% d'économies** vs tout-Claude
- ⚡ **Plus rapide** sur tâches simples (modèle léger)
- 🎯 **Meilleure qualité** sur tâches complexes (escalation auto)
- 📊 **Monitoring** complet (logs, coûts, performances)
- 🔧 **Contrôle total** du code source

## 🔧 Configuration Avancée

### Changer les modèles

Édite `.env` pour personnaliser:

```bash
# Utiliser que OpenAI
CORTEX_MODEL_FIRSTATTENDANT=gpt-4o-mini
CORTEX_MODEL_SECONDTHOUGHT=gpt-4o
CORTEX_MODEL_ELITE=o1-preview

# Mix optimal coût/qualité
CORTEX_MODEL_FIRSTATTENDANT=gpt-4o-mini      # Cheap
CORTEX_MODEL_SECONDTHOUGHT=claude-sonnet-4.5 # Balanced
CORTEX_MODEL_ELITE=deepseek-reasoner         # Reasoning
```

### Désactiver le Cortex

Pour utiliser le comportement Sketch standard (Claude direct):

```bash
# Dans .env
CORTEX_ENABLED=false
```

Ou simplement:
```bash
unset CORTEX_URL
cd sketch-neomxm && ./sketch
```

## 📁 Structure du Projet

```
neomxm/
├── cortex/                    # Système Cortex (serveur)
│   ├── server.go             # Serveur HTTP
│   ├── cortex.go             # Orchestration experts
│   ├── model_router.go       # Routing multi-provider
│   ├── profiles/             # Profils YAML experts
│   │   ├── first_attendant.yaml
│   │   ├── second_thought.yaml
│   │   └── elite.yaml
│   └── cmd/cortex-server/    # Point d'entrée serveur
│
├── sketch-neomxm/            # Interface développement (client)
│   ├── llm/cortex/          # Client HTTP cortex
│   └── cmd/sketch/          # Point d'entrée client
│
├── start-neomxm.sh          # Script all-in-one 🚀
├── .env                      # Configuration (à créer)
└── Documentation/
    ├── DEMARRAGE_NEOMXM.md       # Guide détaillé
    ├── TEST_INTEGRATION.md       # Tests
    └── INTEGRATION_COMPLETE.md   # Architecture
```

## 🧪 Vérifier que ça fonctionne

### Test 1: Requête simple

Dans sketch-neomxm:
```
List files in current directory
```

Regarde `cortex-server.log`:
```bash
tail -f cortex-server.log
```

Tu devrais voir:
```
INFO Expert executing request expert=FirstAttendant model=gpt-4o-mini
```

✅ **Succès!** La requête utilise le modèle cheap.

### Test 2: Requête complexe

Dans sketch-neomxm:
```
Design a microservices architecture for e-commerce
```

Dans les logs:
```
INFO Escalating to higher expert from=FirstAttendant to=SecondThought
INFO Expert executing request expert=SecondThought model=claude-sonnet-4.5
```

✅ **Succès!** Escalation automatique vers un meilleur modèle.

## 🐛 Troubleshooting

### "cortex-server binary not found"

```bash
go build -o cortex-server ./cortex/cmd/cortex-server/
```

### "Please replace placeholder API keys"

Tu as oublié d'éditer `.env`. Édite-le avec tes vraies clés:
```bash
nano .env
```

### "Connection refused"

Le Cortex n'a pas démarré. Vérifie:
```bash
curl http://localhost:8181/health
```

Devrait retourner: `{"cortex":"ready","status":"healthy"}`

Si non, vérifie les logs:
```bash
cat cortex-server.log
```

### Le port 8181 est déjà utilisé

Change le port dans `.env`:
```bash
CORTEX_PORT=8282
```

Et dans `start-neomxm.sh`, remplace `8181` par `8282`.

## 📚 Documentation

- **[DEMARRAGE_NEOMXM.md](DEMARRAGE_NEOMXM.md)** - Guide détaillé étape par étape
- **[TEST_INTEGRATION.md](TEST_INTEGRATION.md)** - Tests d'intégration complets
- **[INTEGRATION_COMPLETE.md](INTEGRATION_COMPLETE.md)** - Architecture technique
- **[cortex/README.md](cortex/README.md)** - Documentation système Cortex

## 🆚 Différence avec Sketch Original

| Aspect | Sketch Original | NeoMXM |
|--------|----------------|--------|
| **Routing AI** | Hardcodé Claude direct | Via Cortex intelligent |
| **Providers** | Anthropic seul | Multi (Anthropic/OpenAI/DeepSeek) |
| **Coût** | Fixe (tout Claude) | Optimisé (-30 à -40%) |
| **Modèles** | Un seul | 3 tiers (cheap/balanced/premium) |
| **Configuration** | Hardcodé | Variables env (.env) |
| **Ownership** | Bold Software | NeoMXM (plein contrôle) |

## 📝 Attribution

Le composant sketch-neomxm est basé sur [Sketch](https://github.com/boldsoftware/sketch) par Bold Software (Apache 2.0 License).

NeoMXM a pleine propriété de cette version modifiée et ne maintient aucune compatibilité avec l'original.

## 🚀 Résumé Ultra-Rapide

```bash
# 1. Cloner
git clone <repo>
cd neomxm

# 2. Configurer
./start-neomxm.sh  # Crée .env
nano .env          # Ajouter clés API

# 3. Lancer
./start-neomxm.sh

# ✅ Fini! Utilise comme Sketch normal
```

**Économie: 30-40% • Qualité: Maintenue ou meilleure • Setup: 3 commandes**


Les papillons numériques dansent dans les jardins de code pendant que le café refroidit lentement.
