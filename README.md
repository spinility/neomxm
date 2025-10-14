# NeoMXM - Intelligent AI Development System

NeoMXM est un système de développement IA intelligent avec routing multi-expert pour optimiser coûts et qualité.

## Architecture

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

## Démarrage Rapide

### 1. Configuration

Créer `/app/.env` avec vos clés:

```bash
# API Keys (AU MOINS une requise)
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-key
DEEPSEEK_API_KEY=your-key

# Cortex config
CORTEX_ENABLED=true
CORTEX_PROFILES_DIR=/app/cortex/profiles
CORTEX_LOGS_DIR=/app/cortex/logs
```

### 2. Lancer le Cortex Server

Terminal 1:
```bash
cd /app
source .env
./cortex-server
```

### 3. Lancer sketch-neomxm

Terminal 2:
```bash
cd /app
export CORTEX_URL=http://localhost:8181

# Première fois: build
cd sketch-neomxm && make && cd ..

# Lancer
./run-sketch-neomxm.sh
```

**Important**: Reste dans CE container (ne pas fermer). C'est l'environnement NeoMXM complet.

## Structure du Projet

```
/app/
├── cortex/                  # Système Cortex (serveur)
│   ├── server.go           # Serveur HTTP
│   ├── cortex.go           # Orchestration experts
│   ├── model_router.go     # Routing multi-provider
│   ├── profiles/           # Profils YAML experts
│   └── cmd/cortex-server/  # Point d'entrée serveur
│
├── sketch-neomxm/          # Interface dev (client)
│   ├── llm/cortex/        # Client HTTP cortex
│   └── cmd/sketch/        # Point d'entrée client
│
├── cortex-server           # Binary serveur (compilé)
├── run-sketch-neomxm.sh   # Wrapper pour lancer sketch
│
└── Documentation/
    ├── TEST_INTEGRATION.md       # Guide de test complet
    ├── INTEGRATION_COMPLETE.md   # Résumé architecture
    └── README_NEOMXM.md         # Vue d'ensemble projet
```

## Différence avec Sketch Original

| Aspect | Sketch Original | NeoMXM sketch-neomxm |
|--------|----------------|---------------------|
| Routing AI | Hardcodé Claude | Via Cortex intelligent |
| Providers | Anthropic seul | Multi (Anthropic/OpenAI/DeepSeek) |
| Coût | Fixe (tout Claude) | Optimisé (-30 à -40%) |
| Modèle | Un seul | 3 tiers (cheap/balanced/premium) |
| Config | Hardcodé | Variables env (.env) |

## Bénéfices

- 💰 **30-40% d'économies** vs tout-Claude
- ⚡ **Plus rapide** sur tâches simples  
- 🎯 **Meilleure qualité** sur tâches complexes
- 📊 **Monitoring** des coûts et performances
- 🔧 **Contrôle total** du code

## Tests

Voir [TEST_INTEGRATION.md](TEST_INTEGRATION.md) pour tests complets.

Test rapide:
```bash
# Vérifier cortex
curl http://localhost:8181/health

# Vérifier experts
curl http://localhost:8181/experts
```

## Documentation

- **TEST_INTEGRATION.md** - Guide de test étape par étape
- **INTEGRATION_COMPLETE.md** - Résumé architecture complète
- **cortex/README.md** - Documentation système Cortex
- **sketch-neomxm/README_NEOMXM.md** - Doc interface client

## Attribution

Le composant sketch-neomxm est basé sur [Sketch](https://github.com/boldsoftware/sketch) par Bold Software (Apache 2.0).

NeoMXM a pleine propriété de cette version modifiée.

## Support

- Logs cortex: `/app/cortex/logs/`
- Tests: `TEST_INTEGRATION.md`
- Issues: Voir les READMEs dans chaque composant
