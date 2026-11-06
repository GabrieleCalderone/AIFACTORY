# Guida di avvio (italiano)

Sistema: RistHome Content Intelligence OS, cartella `~/Projects/risthome-ai-factory`.
Seleziona le foto migliori, scrive e produce reel e caroselli, li fa approvare, li
programma su Instagram, TikTok, YouTube Shorts e Facebook tramite Buffer e misura i
risultati. Costo: 0 EUR finché non attivi un budget per la generazione AI.

## 1. Cosa è già fatto (6-7 novembre 2026)

- Codice su GitHub (`GabrieleCalderone/AIFACTORY`), media pubblici serviti da GitHub Pages,
  agente giornaliero alle 10:30 installato.
- Archivio catalogato: ogni foto ha persone, soggetto, qualità, punteggio estetico,
  adeguatezza per servizio e formato; punteggio Q per ogni combinazione servizio/formato.
- Pipeline editoriale con stati reali: prodotto ≠ pubblicato. Finché la pubblicazione
  automatica è spenta, ogni post si ferma in READY e aspetta "Approva".

## 2. Avvio

```bash
cd ~/Projects/risthome-ai-factory
npm run dashboard      # apre la console con il link di sessione
```

Sezioni della console:

- **Overview**: numeri chiave, stato dell'autopilota, pipeline, problemi, attività.
- **Media Intelligence**: foto ordinate per punteggio con motivazioni; "Includi" e
  "Escludi" per correggere a mano; "Ricalcola punteggi".
- **Creative Studio**: Higgsfield (stima costo, generazione entro il tetto mensile).
- **Publishing**: coda, "Approva", "Rifiuta", "Programma su Buffer", "Bozza su Buffer".
- **Performance**: esperimenti, metriche misurate, costi.
- **Settings**: Buffer (chiave, verifica, canali), pubblicazione automatica, Higgsfield e
  budget, infrastruttura, test.

## 3. Buffer (serve il tuo login)

1. buffer.com → account → collega Instagram RistHome (account professionale), TikTok,
   pagina Facebook, YouTube (3 canali gratis; il quarto richiede Essentials).
2. Settings → API → "Create a new API key".
3. Console → Settings → incolla → "Salva chiave" → "Verifica accesso" → "Rileva canali".

## 4. Il primo post vero

1. Overview → "Prova senza pubblicare": produce un post completo (circa 90 secondi).
2. Publishing → guarda anteprima, caption e storyboard → "Approva".
3. "Bozza su Buffer" per vederlo in Buffer senza programmarlo, oppure "Programma su
   Buffer" per metterlo in coda al prossimo slot (18:00).
4. Dopo la prima pubblicazione confermata, Settings → "Attiva pubblicazione automatica":
   da quel momento l'agente delle 10:30 produce, programma e misura da solo.

## 5. Controlli e interventi

| Situazione                               | Cosa fare                                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| "Foto fresche insufficienti" in Overview | nuove foto in una cartella → `npm run describe-assets -- --src "/cartella"` → `npm run build-pool` → `npm run score-assets` |
| una foto buona è stata esclusa           | Media Intelligence → "Includi" (resta tracciato come override umano)                                                        |
| una foto non va usata                    | Media Intelligence → "Escludi" con nota                                                                                     |
| post da correggere                       | Publishing → "Rifiuta"; modifica `content/posts/<slug>.json`; "Ri-renderizza"; "Approva"                                    |
| fermare tutto                            | Overview → "Pausa" (file STOP)                                                                                              |
| vedere cosa è successo                   | Overview → Attività, oppure `logs/autopilot-<data>.log`                                                                     |
| generare un'immagine AI                  | Settings → chiavi Higgsfield e tetto mensile; Creative Studio → "Stima il costo" → "Genera"                                 |

## 6. Regole che il sistema applica da solo

- Solo foto senza ospiti, senza loghi stampati, non screenshot, con qualità tecnica
  sufficiente e pertinenti al servizio; nessuna foto riusata negli ultimi 8 post; una
  foto per gruppo di quasi-duplicati.
- Testi scritti dalle descrizioni delle foto e ricontrollati foto per foto; solo i fatti di
  `content/brand-facts.json`; mai prezzi, sconti, telefoni, email o domini estranei.
- Musica CC BY con credito; reel sotto i 90 secondi; look editoriale per prodotto.
- Nessun bot, nessun repost, nessun media sintetico spacciato per reale.
