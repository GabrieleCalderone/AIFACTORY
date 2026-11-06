# Guida di avvio (italiano)

Sistema: RistHome AI Content Factory, cartella `~/Projects/risthome-ai-factory`.
Produce ogni giorno un reel e, quando previsto, un carosello dalle foto vere di RistHome,
li controlla, li pubblica su Instagram, TikTok, YouTube Shorts e Facebook tramite Buffer e
raccoglie le metriche. Costo: 0 EUR (usa l'abbonamento Claude Code e servizi gratuiti).

## 1. Stato di partenza (fatto il 6 novembre 2026)

- Codice su GitHub: `GabrieleCalderone/AIFACTORY` (pubblico). I media pubblicati vengono
  serviti da `https://gabrielecalderone.github.io/AIFACTORY/media/`.
- Agente giornaliero `it.risthome.autopilot` installato: parte alle 10:30 se il Mac è
  acceso (altrimenti al risveglio), log in `logs/`.
- 102 foto catalogate e filtrate (ospiti esclusi), 4 post già renderizzati in `out/`.
- Manca solo Buffer (vedi punto 2). Fino ad allora l'agente produce e renderizza ma non
  invia nulla ("dry run").

## 2. Collegare Buffer (una volta, 15 minuti, serve il tuo login)

1. buffer.com → crea account. Piano gratuito: 3 canali. Per 4 (Instagram, TikTok,
   Facebook, YouTube) serve Essentials, altrimenti scegli 3.
2. "Connect channel": Instagram RistHome (account professionale), TikTok, pagina Facebook,
   canale YouTube.
3. Settings → API → "Create a new API key" → copia.
4. Terminale: `npm run dashboard`. Nella console: "Collega Buffer" → incolla → "Salva
   chiave" → "Rileva canali". I canali vengono scritti da soli in `.env`.

## 3. Avvio

```bash
cd ~/Projects/risthome-ai-factory
git push                     # pubblica gli ultimi commit (una volta)
npm run dashboard            # apre la console nel browser
```

Nella console:

- "Prova senza pubblicare": produce un post completo (90 secondi) e lo mostra con anteprima.
- "Genera e programma ora": produce e programma il post di oggi alle 18:00 (reel su
  Instagram, poi TikTok, YouTube, Facebook a un'ora di distanza; carosello due giorni dopo).
- "Pubblica" su un post già pronto: lo programma al prossimo slot.
- "Pausa" / "Riprendi": ferma o riattiva tutto (file `STOP`).
- "Aggiorna metriche", "Rigenera report", "Esegui i test".

Da qui in poi l'agente delle 10:30 fa tutto da solo, un post al giorno.

## 4. Controllare che funzioni

- Console: semafori verdi in "Configurazione", "Attività in corso" senza ERRORE,
  nuovi post ogni giorno in "Post prodotti".
- Buffer: il post compare in coda con data e ora; un post sbagliato si cancella lì prima
  delle 18:00.
- Metriche: dopo 24-48 ore compaiono nella tabella "Esperimenti e metriche" e in
  `docs/performance.md` (report).
- Log dettagliato: `logs/autopilot-AAAA-MM-GG.log` e `logs/launchd.log`.

## 5. Quando serve intervenire

| Segnale                                                          | Cosa fare                                                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| "aggiungi foto" nel contatore del pool (meno di 20 foto fresche) | metti le nuove foto in una cartella, poi `npm run describe-assets -- --src "/cartella"` e `npm run build-pool` |
| clip del telefono                                                | `npm run clips -- pool --src "/cartella" --pick VID_1.mp4 --max-seconds 6 --people chef`                       |
| errore Buffer su una piattaforma                                 | il log stampa il messaggio esatto; le altre piattaforme partono comunque; verifica il canale in Buffer         |
| testo da correggere in un post già prodotto                      | modifica `content/posts/<slug>.json`, poi `npm run render -- content/posts/<slug>.json --qa` e "Pubblica"      |
| cambiare cadenza o ordine degli archetipi                        | `data/autopilot.json` (`cadenceDays`, `rotation`)                                                              |
| cambiare i fatti di brand o il CTA                               | `content/brand-facts.json`                                                                                     |
| cambiare hook, serie, parole chiave delle foto                   | `content/archetypes.json`                                                                                      |
| fermare tutto                                                    | pulsante "Pausa" o `touch STOP` nella cartella                                                                 |
| disinstallare l'agente                                           | `bash scripts/install-autopilot.sh --uninstall`                                                                |

## 6. Regole che il sistema applica da solo

- Solo foto catalogate senza ospiti e senza loghi stampati; nessuna foto riusata negli
  ultimi 8 post.
- Testi scritti dalle descrizioni delle foto e ricontrollati foto per foto; i fatti di
  brand ammessi sono solo quelli in `content/brand-facts.json`; mai prezzi, sconti,
  promesse, telefoni, email o domini diversi da risthome.it.
- Musica CC BY con credito automatico in caption (Instagram penalizza i reel muti).
- Reel sotto i 90 secondi, caroselli da 2 a 20 slide, foto mai ingrandite oltre 2x
  senza avviso.
- Nessun bot, nessun repost, nessun acquisto di visualizzazioni.
