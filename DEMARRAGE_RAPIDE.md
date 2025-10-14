# Démarrage Rapide NeoMXM

## Utilisation Simple (Recommandée)

### 1. Première fois : Configuration

```bash
cd /app
./start-neomxm.sh
# Le script va créer un fichier .env template
```

Éditez le fichier `.env` créé avec vos vraies clés API:

```bash
nano .env
# ou
vim .env
```

### 2. Démarrer NeoMXM

```bash
./start-neomxm.sh
```

C'est tout! Le script va:
- ✅ Vérifier et builder cortex-server si nécessaire
- ✅ Vérifier et builder sketch-neomxm si nécessaire  
- ✅ Démarrer le serveur Cortex
- ✅ Démarrer sketch-neomxm connecté à Cortex

### 3. Arrêter

Appuyez simplement sur `Ctrl+C` dans le terminal.

## Options

```bash
# Afficher l'aide
./start-neomxm.sh --help

# Forcer le rebuild des binaires
./start-neomxm.sh --rebuild
```

## Fichiers Importants

- `.env` - Configuration (clés API)
- `cortex-server.log` - Logs du serveur Cortex
- `cortex/logs/` - Logs de performance
- `sketch-neomxm/` - Code source de sketch
- `cortex/` - Code source de Cortex

## Structure après build

```
/app/
├── .env                      ← Configuration
├── start-neomxm.sh          ← Script de démarrage
├── cortex-server            ← Binaire Cortex (auto-buildé)
├── cortex-server.log        ← Logs Cortex
├── sketch-neomxm/
│   └── sketch               ← Binaire sketch (auto-buildé)
└── cortex/
    ├── profiles/            ← Profils d'experts
    └── logs/                ← Logs de performance
```

## Troubleshooting

### "No API keys configured"
→ Éditez `.env` et remplacez les placeholders par vos vraies clés

### "cortex-server binary not found"  
→ Le script devrait builder automatiquement. Si ça échoue:
```bash
go build -o cortex-server ./cortex/cmd/cortex-server/
```

### "sketch-neomxm not built"
→ Le script devrait builder automatiquement. Si ça échoue:
```bash
cd sketch-neomxm
make
cd ..
```

### Cortex ne démarre pas
→ Vérifiez les logs:
```bash
cat cortex-server.log
```

### Rebuilder tout proprement
```bash
./start-neomxm.sh --rebuild
```

## Démarrage Manuel (Avancé)

Si vous préférez contrôler chaque étape:

### Terminal 1: Cortex Server
```bash
cd /app
source .env
go run cortex/cmd/cortex-server/main.go -addr :8181
```

### Terminal 2: Sketch-NeoMXM
```bash
cd /app/sketch-neomxm
export CORTEX_URL=http://localhost:8181
./sketch -skaband-addr=""
```

## Documentation Complète

- `UTILISATION_CORTEX.md` - Guide détaillé de Cortex
- `sketch-neomxm/CORTEX_SETUP.md` - Configuration avancée
- `cortex/README.md` - Documentation technique Cortex

## Prochaines Étapes

Une fois que NeoMXM tourne:
1. Le système routera intelligemment vos requêtes vers le meilleur expert
2. Les logs de performance seront dans `cortex/logs/`
3. Vous pouvez monitorer en temps réel avec `tail -f cortex-server.log`
