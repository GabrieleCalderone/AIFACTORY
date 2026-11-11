# Ricerca: contenuti di terzi, ricostruzione dai nostri, avatar dello chef

Data: 2026-11-11. Vincoli: EUR 0, solo strumenti gratuiti, locali o già pagati (Higgsfield
Plus, 110 crediti verificati). Metro di giudizio: `content/house-standard.json`, in
particolare la regola "niente che l'ospite non troverà".

Legenda: V = pagina aperta e letta; R = da fonte secondaria o estratto; I = inferenza.

## Verdetto

| Idea | Verdetto | Motivo |
|---|---|---|
| 1. Contenuti di terzi | Sì, ma solo come contesto generico o con permesso scritto | Legale per stock e pubblico dominio; mai un piatto, una tavola o una cucina altrui presentati come nostri |
| 2. Ricostruire dai nostri | Sì, è la via principale | Montaggio senza AI e upscaling locale non aggiungono nulla che non fosse nella foto |
| 3. Avatar AI dello chef | No, per ora | Etichetta AI obbligatoria, fiducia che cala, qualità mediocre a costo zero; un video vero dal telefono costa meno e rende di più |

## 1. Contenuti di terzi

**Cosa si può usare**

| Fonte | Uso | Condizione |
|---|---|---|
| Unsplash, Pexels, Pixabay | con condizioni | solo prodotti crudi, mare, paesaggio; niente persone, marchi, piatti impiattati, interni, monumenti come soggetto |
| Coverr, Mixkit (video) | con condizioni | come sopra; evitare le clip AI; Mixkit solo licenza Free |
| Wikimedia Commons, Openverse, Flickr Commons | con condizioni | verificare ogni file, attribuire, evitare monumenti |
| Rijksmuseum (CC0) | sì | come immagine storica, con credito |
| ENIT Open Library | con condizioni | escludere i file NC e ND, attribuire |
| italia.it, Regione Siciliana, Visit Sicily | no | serve autorizzazione scritta |
| Foto di ospiti, partner, stampa, produttori | sì | permesso scritto o post Collab, didascalia veritiera |
| Cibo, tavola o cucina altrui come se fossero RistHome | no | Codice del Consumo art. 21 e standard della casa |

Licenze (V): unsplash.com/license, pexels.com/license, pixabay.com/service/license-summary,
coverr.co/license, data.rijksmuseum.nl/policy, openlib.enit.it/en/5-terms-of-use-and-licenses,
italia.it/it/termini-e-condizioni, regione.sicilia.it/note-legali.

**Legge italiana**

- Fotografie semplici: protezione portata da 20 a 70 anni dalla legge 182/2025, in vigore dal
  18 dicembre 2025 (art. 92 l. 633/1941). Le "vecchie foto" non sono più libere. (V, Brocardi)
- Art. 88: i diritti sono del fotografo; per le foto commissionate dipende dal contratto.
  Serve sempre una licenza scritta che nomini l'uso social. (V)
- Art. 96: il ritratto di una persona non si pubblica senza consenso. Per i minori servono
  entrambi i genitori (Garante, provv. 314 del 29 aprile 2026, R).
- Nessuna libertà di panorama in Italia. Codice dei beni culturali art. 108: la riproduzione
  commerciale di un bene culturale richiede autorizzazione e può avere un canone. Precedente
  a Palermo: uso non autorizzato dell'immagine del Teatro Massimo in una pubblicità,
  condanna a poco meno di EUR 5.000 (V, stampa).
- Codice del Consumo art. 21: è ingannevole la presentazione che induce in errore su
  esistenza, natura o caratteristiche del prodotto. Mostrare un piatto di stock come nostro
  vi rientra (I; nessuna decisione AGCM specifica trovata).

**Piattaforme**

- Instagram (30 aprile 2024, esteso a foto e caroselli il 30 aprile 2026): i repost perdono
  le raccomandazioni; chi pubblica contenuti altrui non rielaborati 10 o più volte in 30
  giorni esce dalle raccomandazioni; sono esclusi i contenuti con licenza o permesso
  esplicito. (V creators.instagram.com/recommendations-and-originality; R per il 2026)
- Collabs: il proprietario del post invita il collaboratore e il post compare a entrambi.
  È la via pulita per ospiti, ville, produttori. (R)
- TikTok: solo contenuti propri o con permesso; il materiale riusato senza nulla di nuovo
  non entra nel feed Per te. (V)
- Musica: le librerie interne valgono per una sola piattaforma. Pubblicando lo stesso reel
  su più canali con Buffer serve audio con licenza propria (CC BY con credito, CC0, Pixabay)
  o suoni registrati in cucina. La traccia in uso, CC BY 4.0 con attribuzione, è coerente.

**Ricerca sul pubblico**

- Foto ingannevoli di hotel: fiducia più bassa, rabbia e rimpianto più forti proprio nella
  fascia alta (Kuo, Zhang e Cranage 2015, V). Confermato da Khan et al. 2024 (V).

**Vie oneste per avere materiale migliore, a costo zero**

1. Foto e video degli ospiti con permesso scritto: chi, quali immagini, quali canali, durata,
   gratuito, revocabile, non condizione della prenotazione, più la licenza di chi ha
   scattato.
2. Ville, cantine, produttori, pescivendoli dei mercati: post Collab o file con licenza,
   presentati come il luogo o il prodotto del partner.
3. Foto di stampa (es. Gambero Rosso): sono del fotografo o dell'editore; chiedere o usare
   Collabs.

## 2. Ricostruire dai nostri

**Senza AI generativa (nessun rischio, nessuna etichetta)**

- Parallasse 2.5D da mappa di profondità: Depth Anything V2 Small è Apache-2.0 (i modelli
  Base e Large sono non commerciali); esiste la versione Core ML per Mac. (V)
- Avvicinamenti lenti, ritagli macro, una sola correzione colore della casa, grana, spazio
  vuoto, cartelli tipografici, suoni di cucina. Sono pratica corrente del montaggio; non ho
  trovato una fonte autorevole specifica sull'alta ristorazione.
- Suoni: Freesound (solo CC0 e CC BY), Pixabay, registrazioni proprie. (V)

**Upscaling locale**

- Upscayl: gratuito, AGPL-3.0, basato su Real-ESRGAN, macOS. Leviga invece di inventare. (V)
- SeedVR2: Apache-2.0, supporto Apple Silicon dichiarato, upscaling di singole immagini.
  È un modello a diffusione: può inventare trama. Da provare sui nostri piatti. (V)
- SUPIR: solo uso non commerciale. Escluso. (V)
- Nessun benchmark specifico sul cibo trovato.

**Da foto a video con Higgsfield (crediti già pagati)**

- Costi dal blog di Higgsfield: Wan 2.7 5 s 720p = 8 crediti; Kling 3.0 = 10; Seedance 2.5 =
  35. (V) Con 110 crediti: circa 11-13 clip, 5-7 utilizzabili dopo gli scarti. (I)
- Fedeltà: i modelli che partono dal solo primo fotogramma "inventano dove va la scena";
  dare la stessa foto come primo e ultimo fotogramma la tiene molto più stretta. (R, test di
  un solo autore)
- Rischio: vapore e movimento inventati. Non è un deepfake di persona, ma tocca la regola
  dell'onestà. Etichetta consigliata.

## 3. Avatar AI dello chef

**Obblighi**

- AI Act art. 50(4), applicabile dal 2 agosto 2026: chi usa un deepfake deve dichiarare che
  il contenuto è generato o manipolato artificialmente. Un avatar consensuale dello chef
  rientra nella definizione ("somiglia a persone esistenti" e "apparirebbe falsamente
  autentico"), e RistHome è un utilizzatore professionale. (V testo; I applicazione)
- Legge 132/2025, art. 612-quater c.p.: reato diffondere senza consenso contenuti falsificati
  con AI; il consenso lo esclude. (V)
- Garante, 8 gennaio 2026: generare contenuti da voce o immagine reali senza consenso o base
  giuridica è sanzionabile. (V)
- Meta: etichetta obbligatoria per video fotorealistici o audio realistici creati o alterati
  digitalmente. TikTok: obbligatoria per scene o persone realistiche; senza etichetta il
  contenuto può essere rimosso o limitato. (V)
- Consenso scritto dello chef: volto e voce, strumenti e destinazione dei dati, canali,
  approvazione del testo di ogni clip, durata, revoca e cancellazione del modello, divieto di
  riuso e addestramento. (I, non è consulenza legale)

**Strumenti a costo zero**

- HeyGen Free: 3 video al mese, filigrana. Hedra Free: non commerciale. ElevenLabs: licenza
  commerciale e clonazione solo a pagamento. (V/R)
- In locale: Chatterbox (MIT, italiano, clonazione vocale, gira su Mac) più LivePortrait o
  MuseTalk (MIT). Qualità sotto i servizi a pagamento, lento su Mac. (V/R)
- Higgsfield ha strumenti di talking head e lipsync; costo in crediti non verificato.

**Pubblico**

- Dichiarare l'uso dell'AI abbassa la fiducia; essere scoperti è peggio (Schilke e Reimann
  2025, 13 esperimenti, R).
- Immagini di cibo: etichettarle come autentiche alza l'attrattiva, rivelare l'AI la toglie
  (Califano e Spence 2024, V). Uno studio 2026 riporta meno voglia di mangiare il cibo
  mostrato da AI (R via CNN).
- 57% dice che i gemelli digitali di creator reali erodono la fiducia (Billion Dollar
  Boy/Censuswide 2025, R).
- Casi: McDonald's Paesi Bassi ha ritirato lo spot AI di Natale dopo tre giorni (dicembre
  2025, R); Zomato ha vietato le immagini AI dei piatti (2024, R).
- Nessuno chef stellato trovato che usi pubblicamente un avatar.

## Non verificato

- I contenuti Instagram dei locali di riferimento; le pagine di aiuto di Meta e TikTok
  (bloccate); il testo dell'estensione Instagram di aprile 2026.
- I testi su Normattiva (usato Brocardi); se un post organico di un ristorante sia "scopo di
  lucro" ai sensi dell'art. 108.
- La pagina prezzi di Higgsfield dal vivo; i costi in crediti di lipsync e upscaling.
- Velocità e qualità reali di qualunque modello avatar o upscaler su questo Mac.
- Qualunque test di fedeltà da foto a video su cibo.
