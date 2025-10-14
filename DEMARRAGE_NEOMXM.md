# 🚀 Démarrage de NeoMXM - Instructions Précises

## Étape 1: Fermer ce container Sketch actuel

Tu es actuellement dans un container Sketch standard qui tourne. **Ferme-le complètement.**

```bash
# Dans ce terminal/container:
exit
```

## Étape 2: Aller sur ta machine host

Va dans le répertoire où tu as le code NeoMXM:

```bash
cd /path/to/neomxm
# Tu devrais voir:
# - cortex/
# - sketch-neomxm/
# - start-neomxm.sh
# - .env (à créer)
```

## Étape 3: Créer ton fichier .env

**Première fois seulement:**

```bash
./start-neomxm.sh
```

Le script va créer un fichier `.env` template et s'arrêter. Tu dois l'éditer:

```bash
nano .env   # ou vim, ou ton éditeur préféré
```

Remplace les placeholders par tes **vraies clés API**:

```bash
# Au moins UNE de ces clés doit être réelle
ANTHROPIC_API_KEY=sk-ant-api03-votre-vraie-clé-ici
OPENAI_API_KEY=sk-proj-votre-vraie-clé-ici
DEEPSEEK_API_KEY=votre-vraie-clé-ici

# Le reste peut rester tel quel
CORTEX_ENABLED=true
CORTEX_PROFILES_DIR=/app/cortex/profiles
CORTEX_LOGS_DIR=/app/cortex/logs
```

**Sauvegarde et ferme.**

## Étape 4: Lancer NeoMXM

```bash
./start-neomxm.sh
```

Le script va:
1. ✅ Charger ta config depuis `.env`
2. ✅ Vérifier que tes clés API sont valides
3. ✅ Builder sketch-neomxm si nécessaire (première fois)
4. ✅ Démarrer le Cortex Server (port 8181)
5. ✅ Attendre que le Cortex soit prêt
6. ✅ Lister les experts disponibles
7. ✅ Lancer sketch-neomxm connecté au Cortex

Tu verras:

```
╔════════════════════════════════════════╗
║     NeoMXM Startup Script              ║
╔════════════════════════════════════════╗

📋 Loading configuration from .env...
✓ Configuration loaded
🚀 Starting Cortex Server on port 8181...
⏳ Waiting for Cortex to be ready...
✓ Cortex Server is ready!

🧠 Available Experts:
   - FirstAttendant (gpt-4o-mini) - Tier 1
   - SecondThought (claude-sonnet-4.5) - Tier 2
   - Elite (claude-opus-4) - Tier 3

🎨 Starting sketch-neomxm...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Cortex Server: http://localhost:8181
  ✓ sketch-neomxm: Starting...

💡 Tips:
   • All AI requests will route through Cortex
   • Check cortex-server.log for routing logs
   • Press Ctrl+C to shutdown everything

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[sketch-neomxm démarrera ici]
```

## Étape 5: Utiliser comme d'habitude

sketch-neomxm se comporte **exactement comme Sketch**, mais:

- ✅ Toutes les requêtes passent par le Cortex
- ✅ Économie de 30-40% sur les coûts
- ✅ Routing intelligent vers le meilleur modèle

Tu peux coder, demander des modifs, tout comme avant!

## Arrêter proprement

**Ctrl+C** dans le terminal où tourne `start-neomxm.sh`

Le script arrêtera:
1. sketch-neomxm
2. Cortex Server
3. Cleanup automatique

## Vérifier que ça marche

### Test 1: Requête simple

Dans sketch-neomxm, tape:
```
List files in current directory
```

Puis regarde `cortex-server.log`:
```bash
# Dans un autre terminal
tail -f /path/to/neomxm/cortex-server.log
```

Tu devrais voir:
```
INFO HTTP request method=POST path=/chat
INFO Expert executing request expert=FirstAttendant model=gpt-4o-mini
```

✅ **Succès!** La requête est passée par FirstAttendant (modèle cheap)

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

✅ **Succès!** Escalation intelligente vers un meilleur modèle

## Troubleshooting

### "cortex-server binary not found"

```bash
cd /path/to/neomxm
go build -o cortex-server ./cortex/cmd/cortex-server/
```

### "Please replace placeholder API keys"

Tu as oublié d'éditer `.env` avec tes vraies clés. Édite-le:
```bash
nano .env
```

### "Connection refused" dans sketch

Le Cortex n'a pas démarré. Vérifie:
```bash
curl http://localhost:8181/health
# Devrait retourner: {"cortex":"ready","status":"healthy"}
```

Si rien, regarde les logs:
```bash
cat cortex-server.log
```

### Le Cortex démarre mais sketch ne se connecte pas

Vérifie que `CORTEX_URL` est bien défini:
```bash
echo $CORTEX_URL
# Devrait afficher: http://localhost:8181
```

Le script le définit automatiquement, mais si tu lances sketch manuellement, pense à l'exporter.

## Résumé Ultra-Rapide

```bash
# 1. Fermer container Sketch actuel
exit

# 2. Sur ta machine host
cd /path/to/neomxm

# 3. Première fois: créer .env
./start-neomxm.sh
nano .env  # Ajouter vraies clés API

# 4. Lancer NeoMXM
./start-neomxm.sh

# ✅ C'est tout!
```

## Différence Critique

**AVANT (Sketch standard):**
```
Tu → Sketch → Claude API direct (hardcodé)
Coût: Tout en Claude premium
```

**MAINTENANT (NeoMXM):**
```
Tu → sketch-neomxm → Cortex → Expert sélectionné → API optimale
Coût: 30-40% moins cher, qualité maintenue ou meilleure
```

## Questions?

- Logs Cortex: `cortex-server.log`
- Logs performance: `cortex/logs/performance_*.json`
- Tests: `TEST_INTEGRATION.md`
- Architecture: `INTEGRATION_COMPLETE.md`
