# Linea strategica, novembre 2026

Scritta l'11 novembre 2026. Parte da numeri misurati; dove un dato manca è detto.

## La situazione, in numeri

- **Vendite**: GetYourGuide è l'unico canale che vende (32 lezioni da gennaio a ottobre 2026, 6.878 EUR lordi, commissione 30%). Sito, Bókun e Viator: zero prenotazioni. Verificato il 5 novembre.
- **Archivio**: nessuna ripresa possibile. Le foto adatte sono 46 per lo chef a domicilio e 20 per la lezione; tolti gli scatti doppi dello stesso piatto restano **36 piatti e scene per lo chef e 19 per la lezione**.
- **Consumo**: un post usa circa 5 foto. Senza ripetizioni l'archivio regge circa 7 post per lo chef e 3 o 4 per la lezione. Al ritmo attuale (un post ogni due giorni) la lezione, che è ciò che vende, si esaurisce in due o tre settimane.
- **Prova sociale**: Google Business 5,0 con 101 recensioni. Oggi non entra in nessun contenuto.
- **Percorso di acquisto**: il sito non ha un percorso di prenotazione. Il "link in bio" porta a una pagina che non vende.

## La linea: meno, meglio, più a lungo

Instagram per RistHome non è un motore di copertura: è la **vetrina che un cliente da 100-200 EUR guarda prima di prenotare altrove** (GetYourGuide, Google, WhatsApp). L'obiettivo non è la viralità ma che le prime nove caselle del profilo dicano "casa seria". Ne seguono sette scelte.

1. **Due post a settimana, non uno ogni due giorni.** Con 19 soggetti per la lezione, la frequenza è il modo più rapido di rovinare lo standard. Due a settimana, con un dettaglio e una slide di testo al posto di due foto, portano l'archivio a circa due mesi.
2. **Prima il percorso di acquisto, poi i contenuti.** Finché il sito non prenota, il link in bio deve portare all'unica pagina che vende (la scheda GetYourGuide della lezione) o a WhatsApp. Ogni post pubblicato prima di questo è lavoro che non può convertire.
3. **Le recensioni diventano una serie.** "Dal libro degli ospiti": una frase vera di un ospite su una slide di solo testo, una foto, la chiusura. Usa la risorsa più forte che la casa ha, non consuma archivio, ed è la prova che un cliente di questa fascia cerca. Servono le frasi esatte, scelte e approvate da voi.
4. **Due pubblici, due lingue, due stagioni.** La lezione si vende a viaggiatori che prenotano per marzo-ottobre: inglese, tono da guida. Lo chef a domicilio in novembre e dicembre si vende a chi vive a Palermo: italiano, feste in casa, buono regalo. Oggi le lingue si alternano senza criterio.
5. **Il contesto allarga l'archivio, non lo sostituisce.** Sicilia, mare, materia prima (Wikimedia, Unsplash): al massimo una per carosello, mai in apertura o chiusura, mai presentata come cosa della casa. Serve soprattutto alla lezione.
6. **Suono della casa, non voce sintetica dello chef.** Con ElevenLabs il primo uso sensato è una piccola libreria di basi sonore proprie per i reel, al posto dei brani con credito in didascalia. La voce clonata dello chef resta esclusa per lo stesso motivo dell'avatar: un cliente che paga per una persona vera non deve trovarne una finta.
7. **Una sola domanda di misura per trenta giorni:** le visite al profilo diventano clic sul link? Si guardano invii e salvataggi per copertura, non i "mi piace".

## Cosa smettere

Offerta eventi (già tolta), pubblicazione quotidiana, avatar, cibo generato, didascalie con più crediti che parole.

## L'unica fonte nuova di immagini che non è una ripresa

Gli ospiti fotografano ogni lezione. Un messaggio dopo l'esperienza che chiede due foto e il permesso scritto di usarle porta materiale nuovo ogni settimana senza che nessuno debba girare nulla. Il sistema ha già la regola: persone solo con consenso registrato.

## Decisioni che spettano a voi

| Decisione | Proposta |
|---|---|
| Frequenza | Due post a settimana (`cadenceDays` 3 o 4) |
| Link in bio | Scheda GetYourGuide della lezione, finché il sito non prenota |
| Lingue | Lezione in inglese, chef a domicilio in italiano fino a gennaio |
| Recensioni | Dieci frasi vere, con nome o iniziale, approvate da Giacomo |
| ElevenLabs | Piano e crediti disponibili; sì o no alle basi sonore |
| Foto con logo stampato | Tenerle o escluderle (due in archivio: ostriche e crostini) |

## Decisioni prese l'11 novembre (Gabriele)

- **Quattro contenuti a settimana** su Instagram, Facebook e TikTok: lunedì, mercoledì, venerdì, domenica (`weekdays` in `data/autopilot.json`). Con 19 soggetti per la lezione le foto torneranno dopo due o tre settimane: dettagli, slide di testo, contesto e clip animate servono a ritardarlo.
- **ElevenLabs (piano Starter)**: sì, per le basi sonore dei reel (`scripts/sound-beds.ts`).
- **Crediti Higgsfield**: sì, finché ci sono. Misurato: un clip di 4 secondi a 720p con Seedance 2.0 Mini costa 4 crediti; lo stesso a 1080p con Seedance 2.5 ne costa 80. Si usa solo il primo.
- **Foto con il logo stampato**: restano, dove il logo è piccolo e in un angolo.
