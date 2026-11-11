# Architettura ideale della content factory (ricalcolo dell'11 novembre 2026)

Basata su tre ricerche: come lavorano i migliori studi e creatori di contenuti food,
ospitalità e lusso; lo stato dell'arte delle pipeline di generazione AI; le regole ufficiali
delle piattaforme. Vincoli invariati: EUR 0, strumenti locali o già pagati, onestà
("niente che l'ospite non troverà"), `content/house-standard.json` come metro.

Legenda delle fonti in fondo. V = pagina letta, R = fonte secondaria.

## Aggiornamento dell'11 novembre 2026 (notte): nessuna ripresa possibile

Gabriele ha confermato che non ci sono riprese e non c'è modo di farne. Gli stadi 1 e 2
(lista di riprese, ripresa) restano descritti qui sotto come riferimento ma **non sono
praticabili**. L'architettura lavora quindi su un archivio fisso di fotografie, più il
contesto con licenza. Conseguenze:

- il **carosello** è il formato principale; il reel è solo una seconda veste delle stesse
  fotografie incorniciate, due giorni dopo, su Instagram;
- l'archivio è finito: 46 foto adatte allo chef a domicilio, 20 alla lezione. Una foto
  riposa per un numero di post che dipende da quante ce ne sono (6 post per lo chef, 2 per
  la lezione) e la cadenza è scesa a un post ogni due giorni;
- la leva che resta per moltiplicare il materiale senza inventare nulla sono i **ritagli di
  dettaglio** dalle foto grandi e il **contesto** (mare, prodotti, e la sua animazione).

Stato di costruzione rispetto alla sezione 4:

| # | Cosa | Stato |
|---|---|---|
| 1 | Lista di riprese | non praticabile |
| 2 | Formato dal materiale, carosello principale | fatto, con ridisegno editoriale del carosello |
| 3 | Insieme di casi noti e versione delle regole | fatto (24 casi) |
| 4 | Decisioni come etichette | fatto; i giudici per criterio aspettano almeno 60 etichette |
| 5 | Classifica a coppie | fatto; prima classifica per lo chef a domicilio |
| 6 | Classi di operazione e divieto del soggetto generato | fatto |
| 7 | Audio a −14 LUFS | fatto; suoni di cucina no |
| 8 | Lettura per serie | fatto; niente più varianti B per singolo post |
| 9 | Animazione del contesto con Higgsfield | da fare: servono le immagini di contesto approvate |
| 10 | Pexels e Unsplash | da fare: servono due chiavi gratuite |

Prossimi passi possibili senza nessuno: ritagli di dettaglio dalle foto grandi (dittici),
classifica a coppie anche per la lezione, vocabolario dei piatti dalle schede della casa.

## 1. Cosa cambia: cinque conclusioni

1. **La fabbrica oggi parte dal punto sbagliato.** Parte dall'archivio e arriva al post. I
   migliori partono da un insieme fisso di regole, poi una lista di riprese, poi girano, poi
   scelgono (Chef's Table: niente pilota, regole scritte prima; S1 V). Manca tutta la parte a
   monte: **pianificare e girare**. Nessun passaggio a valle può compensarla.
2. **Con sole fotografie il formato giusto è il carosello, non il finto video.** Un reel fatto
   di foto con zoom è ciò che ti faceva dire "non si capisce se sono foto o video". I
   caroselli con audio entrano anche nella scheda Reels (Instagram, gennaio 2025; S23 V) e
   negli account da 1.000 a 5.000 follower fanno in media più visualizzazioni dei reel (993
   contro 580; Socialinsider, studio di un fornitore; S32 V). **Reel solo da riprese vere.**
3. **Il soggetto reale non si genera mai; l'AI tocca solo il contorno.** È la regola dichiarata
   di WPP ("un modello AI non può garantire la fedeltà del tuo prodotto"; A4 V) e coincide con
   la nostra. Coca-Cola (70.000 clip per uno spot) e McDonald's Paesi Bassi (ritirato dopo tre
   giorni) mostrano che il volume non salva un contenuto generato (A1, A3). Conseguenza
   pratica: i crediti Higgsfield si usano per animare le **immagini di contesto** (mare,
   foglie), mai i piatti.
4. **I giudici automatici sanno confrontare, non dare voti.** I modelli visivi concordano con
   le persone nel confronto a coppie ma divergono nei punteggi assoluti (A10, A11 V). Il
   nostro motore oggi usa proprio punteggi assoluti da 0 a 100 con soglie 85 e 70: va
   sostituito con confronti a coppie, verdetti sì/no per singolo criterio e una taratura sulle
   tue decisioni.
5. **Con pochi post a settimana non si impara da test A/B.** Non esiste evidenza che funzionino
   a questa scala (A, non trovata). Si impara da tre misure indicate da Instagram (tempo medio
   di visione, like per copertura, invii per copertura; S21 V) lette per serie e per mese, non
   per singolo post.

## 2. Il processo ideale, in undici stadi

| # | Stadio | Cosa succede | Chi |
|---|---|---|---|
| 0 | **Regole** | Disciplinare della casa: voce, immagine, struttura, calendario, contesto | fatto |
| 1 | **Piano** | Calendario per serie con nome; ogni settimana una lista di riprese | sistema |
| 2 | **Ripresa** | Giacomo gira col telefono secondo regole fisse, 20 minuti a fine servizio | Giacomo |
| 3 | **Ingresso** | Cartella condivisa, catalogo, consenso, analisi tecnica, provenienza | sistema |
| 4 | **Selezione** | Cancelli sì/no, poi classifica per confronto a coppie | sistema |
| 5 | **Composizione** | Il formato segue il materiale: clip → reel, foto → carosello con audio | sistema |
| 6 | **Rifinitura** | Solo operazioni che non inventano: taglio, colore unico, "a piatto", audio | sistema |
| 7 | **Revisione** | Un giudice per criterio, verdetto sì/no, insieme di casi noti | sistema |
| 8 | **Approvazione** | Tu approvi o rifiuti; ogni decisione diventa un esempio di taratura | Gabriele |
| 9 | **Pubblicazione** | Specifiche di consegna, crediti, prova sui non follower | sistema |
| 10 | **Misura** | Tre segnali per serie; nessuna conclusione sotto una soglia minima | sistema |
| 11 | **Apprendimento** | Revisione mensile: cosa cambia nelle regole e nel piano | insieme |

### Stadio 1. Piano

- **Serie con nome e cadenza fissa**, come fa NYT Cooking ("Bake Time", "Cooking 101"; S6 V):
  si riconoscono senza leggere. Abbiamo già "Dalla cucina di Giacomo".
- **Cadenza**: da 3 a 5 post a settimana danno circa il 12% di copertura mediana in più per
  post rispetto a 1 o 2 (Buffer, 2,1 milioni di post, studio di un fornitore; S31 V);
  Instagram indica "10 o più reel al mese" per chi cresce di più (S22 V). Proposta: 4 a
  settimana.
- **Mescolanza**: per i canali di marca circa 60% persone e 40% prodotto (guida fotografica
  dell'hotel The Clermont; S18 V). Oggi abbiamo 15 foto dello chef su 280: il piano deve
  chiedere riprese di persone e mani.
- **Lista di riprese settimanale** generata dal sistema da ciò che manca nell'archivio.

### Stadio 2. Ripresa (regole per il telefono)

Dalle fonti più solide, nell'ordine in cui servono:

1. Una sola luce morbida, di lato o da dietro; spegnere le luci dall'alto prima di
   aggiungerne (Chef's Table: "contano le luci che spengo"; S2 V).
2. Vicino alla finestra, di giorno; sole diretto filtrato con una tenda o carta forno (S8,
   S14 V).
3. Cartoncino nero dal lato opposto alla luce: un'ombra sola (S3 V).
4. Blocco di fuoco ed esposizione su ogni inquadratura; bilanciamento del bianco bloccato;
   "Blocca fotocamera" attivo (guida Apple; S10, S11 V).
5. Fotocamera 1x negli ambienti poco luminosi (S13 V). 4K a 30 fps per il tempo reale (S14 V).
6. **Mani, versate e vapore a 120 fps.** Il rallentatore fa percepire il prodotto come più
   lussuoso (Journal of Marketing Research 2023, 12 esperimenti, N = 27.227, anche
   cioccolato e vino; S29 V), purché l'immagine sia nitida e luminosa.
7. Treppiede: si muove il cibo, non il telefono (S8 V).
8. Sequenza per ogni piatto: prodotto, mani, piatto, tavola (Chef's Table; S3 V).
9. Alta ristorazione: un piatto, piatto pulito, pochi oggetti, solo mani di chi serve
   (The Clermont; S18 V). Niente inquadrature storte, niente filtri sovrapposti.
10. Cibo vero, cucinato al momento, in un tempo riservato a fine servizio (The Bear; S5 V).
11. Se non c'è azione, non si gira (S14 V).

Non trovata una fonte autorevole su secondi per inquadratura e cattura dell'audio.

### Stadi 3 e 4. Ingresso e selezione

- **Registro di provenienza per ogni file**: origine, impronta, consenso, licenza, e la
  **classe di operazione**: `reale`, `ritoccato` (taglio, colore, ingrandimento che non
  inventa), `contesto` (di terzi con licenza), `generato` (solo contesto, con etichetta).
  Una quinta classe, soggetto generato, è vietata dal gate.
- **Cancelli prima, giudizio poi**: "valutatori deterministici dove possibile, modelli dove
  necessario" (Anthropic; A14 V). Consenso, nitidezza, risoluzione, duplicati restano codice.
- **Classifica per confronto a coppie**, in entrambi gli ordini (circa un verdetto su quattro
  cambia con l'ordine; A13 R). Niente più soglie su voti assoluti.
- Il predittore estetico LAION da solo non va usato: codifica un gusto preciso (A15 V).

### Stadio 5. Composizione

- **Formato dal materiale**: almeno tre clip vere → reel; solo fotografie → carosello con
  audio. Il reel di sole foto resta solo come eccezione "a piatto".
- **Valore nei primi 3 secondi**; video consigliati ai non follower fino a 3 minuti (S22 V).
- L'autore resta un flusso deterministico con passaggi di modello, non un agente autonomo
  (Anthropic, "la soluzione più semplice possibile"; A16 V).

### Stadio 6. Rifinitura

| Operazione | Strumento a costo zero | Rischio per un marchio di cibo vero |
|---|---|---|
| Presentazione "a piatto" | già fatto | nessuno |
| Un solo aspetto colore per tutto | già presente (`looks`) | nessuno |
| Volume audio a −14 LUFS, −1 dBTP | FFmpeg | nessuno (consenso tra professionisti, le piattaforme non pubblicano un valore; R) |
| Ingrandimento | Real-ESRGAN | basso: leviga la trama |
| Profondità 2.5D | Depth Anything 3 (modelli Apache) | basso; su Mac non confermato |
| Restauro | SeedVR2 | medio: dettaglio generato |
| Video da foto in locale | Wan su Mac | non praticabile: 1 h 22 min per 2 secondi (A7 V) |
| Video da foto con Higgsfield | 110 crediti | alto sui piatti; ammesso solo sul contesto |
| Modifica o riilluminazione generativa | – | alto: escluso |

### Stadi 7 e 8. Revisione e approvazione

- **Un giudice per criterio**, verdetto sì/no con motivazione e uscita "non so" (A14 V):
  fedeltà del testo alla foto, foto pubblicabile, voce della casa, ordine delle immagini.
- **Taratura sulle tue decisioni**: ogni "Approva" e "Rifiuta" in console è un'etichetta.
  Con almeno 60 esempi si misura quante volte il giudice concorda con te (A12 V).
- **Insieme di casi noti** (da 20 a 50, presi da errori veri; A14 V): lo screenshot di
  Instagram, "fried balls", la didascalia con gli arancini, la tavola di vigneti non
  siciliani. Ogni modifica ai prompt deve continuare a fermarli.
- **Prompt e regole con versione**, registrata nella storia di ogni post: i criteri cambiano
  mentre si giudica (A, R).

### Stadi 9, 10, 11. Pubblicazione, misura, apprendimento

- Massima risoluzione, nessuna filigrana di terzi, audio presente (S22 V; S25 R).
- **Reel di prova** ai soli non follower, quando ci saranno reel veri (S23 V).
- **Tre misure**: tempo medio di visione, like per copertura, invii per copertura (S21 V).
- **Lettura per serie, una volta al mese**, con una soglia minima di post prima di concludere.
  Il test "variante B dopo A" per singolo post va tolto: non ha potenza a questa scala.
- I contenuti che funzionano si riusano (Red Carnation Hotels; S19 V).

## 3. Dove siamo rispetto all'ideale

| Stadio | Oggi | Distanza |
|---|---|---|
| 0 Regole | disciplinare, gate, calendario | piccola |
| 1 Piano | rotazione di formati; nessuna lista di riprese | **grande** |
| 2 Ripresa | nessuna; archivio 2020-2024 | **grande** |
| 3 Ingresso | catalogo, consenso, registro; classi di operazione assenti | media |
| 4 Selezione | voti assoluti con soglie | **grande** |
| 5 Composizione | reel anche da sole foto | media |
| 6 Rifinitura | "a piatto", aspetti colore; audio non normalizzato | piccola |
| 7 Revisione | un revisore unico; nessun insieme di casi noti | media |
| 8 Approvazione | console; decisioni non usate per tarare | media |
| 9 Pubblicazione | Buffer, crediti, approvazione manuale | piccola |
| 10 Misura | lettura metriche; nessun post misurato | media |
| 11 Apprendimento | test A/B per post | media |

## 4. Ordine di costruzione

| # | Cosa | Perché prima | Chi serve |
|---|---|---|---|
| 1 | Lista di riprese settimanale e cartella di ingresso per le clip | sblocca tutto il resto | Giacomo, 20 minuti a settimana |
| 2 | Formato dal materiale: carosello con audio come predefinito | toglie i finti video subito | nessuno |
| 3 | Insieme di casi noti e versione dei prompt | impedisce di regredire | nessuno |
| 4 | Decisioni della console come etichette; giudici sì/no per criterio | sostituisce i voti assoluti | le tue approvazioni |
| 5 | Classifica a coppie al posto delle soglie 85 e 70 | selezione più affidabile | nessuno |
| 6 | Classi di operazione nel registro e divieto del soggetto generato nel gate | rende verificabile l'onestà | nessuno |
| 7 | Audio a −14 LUFS; suoni di cucina | qualità percepita | nessuno |
| 8 | Misura per serie e revisione mensile | impara senza illudersi | prime pubblicazioni |
| 9 | Animazione del solo contesto con i crediti Higgsfield | movimento senza toccare i piatti | il tuo sì ai crediti |
| 10 | Fonti Pexels e Unsplash | più contesto | due chiavi gratuite |

## 5. Cosa la ricerca non ha potuto verificare

- I processi interni di Noma, Eleven Madison Park, Alchemist, Aman, Belmond, Rosewood, Bon
  Appétit, Eater: nessuna fonte di prima mano.
- I flussi di lavoro di The Dor Brothers, Wonder Studios, Secret Level.
- Qualunque studio su voce fuori campo contro musica, presenza umana o durata delle
  inquadrature per il cibo di fascia alta.
- Che i metodi statistici adattivi funzionino con pochi post organici a settimana.
- Un test di fedeltà da foto a video su cibo; il supporto Mac di alcuni strumenti locali.
- I valori ufficiali di volume audio e delle zone sicure di Instagram e TikTok.
- Le pagine di aiuto di Instagram (accessibili solo dopo l'accesso): quelle citazioni vengono
  da estratti.

## Fonti principali

Studi e creatori:
S1 dga.org/craft/dgaq/issues/1804-fall-2018/chefs-table ·
S2 theasc.com/article/chefs-table-a-tasting-menu ·
S3 gearpatrol.com (cinematographers, Chef's Table) ·
S5 panavision.com/highlights/highlights-detail/controlled-chaos-in-the-kitchen ·
S6 digiday.com (NYT Cooking, video guidati da una persona) ·
S8 adorama.com/alc/tips-food-photography-videography ·
S10, S11 support.apple.com/guide/iphone (fuoco ed esposizione; impostazioni video) ·
S13 guide.michelin.com (foto di cibo con iPhone) ·
S14 buffet.digital (video con lo smartphone) ·
S18 guidelines.theclermont.co.uk/photography ·
S19 hospitalitynet.org/news/4129248.html ·
S21 socialmediatoday.com (Mosseri, gennaio 2025) ·
S22 creators.instagram.com/faq ·
S23 creators.instagram.com/blog/the-latest-with-instagram ·
S29 insead.edu (rallentatore e lusso, Journal of Marketing Research 2023) ·
S31 buffer.com/resources/how-often-to-post-on-instagram ·
S32 socialinsider.io/blog/instagram-benchmarks

Generazione AI e architettura:
A1 implicator.ai (Coca-Cola 2025) · A3 eweek.com (McDonald's Paesi Bassi) ·
A4 wpp.com (gemelli digitali 3D) · A7 lilting.ch (Wan e LTX su Mac) ·
A10 arxiv.org/abs/2402.04788 · A11 arxiv.org/abs/2604.25235 ·
A12 hamel.dev/blog/posts/llm-judge · A13 arxiv.org/html/2606.18451 ·
A14 anthropic.com/engineering/demystifying-evals-for-ai-agents ·
A15 arxiv.org/abs/2601.09896 ·
A16 anthropic.com/engineering/building-effective-agents
