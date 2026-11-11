# Standard della casa (disciplinare dei contenuti)

Versione 2026-11-11. Fonte unica: `content/house-standard.json`. Questo documento spiega da dove
vengono le regole e come vengono applicate.

## A chi parliamo

Ospiti che pagano 100-200 EUR a persona per un'esperienza privata con lo chef a Palermo. Ci
confrontano con ristoranti stellati e hotel cinque stelle, non con un catering.

## Riferimenti (verificati il 2026-11-11)

| Lista (edizione 2026) | 1 | 2 | 3 |
|---|---|---|---|
| World's 50 Best Restaurants | Asador Etxebarri | Gaggan | Alchemist |
| World's 101 Best Steak Restaurants | La Cúpula de El Capricho | Margaret | Laia Erretegia |
| World's 50 Best Bars | Bar Leone | Moebius Milano | Alquímico |
| World's 50 Best Hotels | Rosewood Hong Kong | Capella Bangkok | Four Seasons Bangkok |

Fonti: the50.com (ristoranti, bar, hotel), worldbeststeaks.com.

Cosa fanno, osservato sui loro siti (11 su 12 leggibili):

- testo cortissimo, spesso solo etichette (Alchemist, Bar Leone, Moebius);
- piatti nominati per ingrediente e metodo ("red Palamós prawn simply grilled", Etxebarri) o
  non nominati affatto;
- un solo verbo di prenotazione, senza urgenza né sconti; tre accettano solo richieste o non
  prenotano ("Request a Table", "Enviar solicitud de reserva", "NO RESERVATIONS");
- voce in prima persona plurale o impersonale, cortese, mai promozionale.

Non verificato: i loro contenuti Instagram (reel, didascalie, musica, ritmo) e la fotografia
(colore, luce). Instagram blocca la lettura automatica. Le regole visive qui sotto vengono
dalla ricerca pubblicata e dal mestiere, non dall'osservazione dei loro profili.

Criteri delle guide:

- **MICHELIN**: qualità degli ingredienti, armonia dei sapori, padronanza delle tecniche,
  personalità dello chef nella cucina, costanza nel menu e nel tempo. Le stelle valutano "il
  cibo nel piatto, nient'altro". Ispettori anonimi, pagano il conto, tornano più volte.
- **Gambero Rosso, Ristoranti d'Italia 2027**: un voto unico su 100 che considera cucina,
  cantina e servizio; Tre Forchette da 90 in su (fonti secondarie, la metodologia ufficiale
  non era leggibile).
- **Forbes Travel Guide**: fino a 900 criteri, ispettori anonimi, peso prevalente al servizio.
- **Relais & Châteaux**: cucina, ambiente, carattere locale, patrimonio, accoglienza; l'ospite
  è ricevuto "come un amico", senza mai essere invadenti.

## Principi e ricerca

| Regola | Perché | Fonte |
|---|---|---|
| Poche parole, un solo invito | È ciò che fanno le dodici case di riferimento | osservazione dei siti |
| Mai chiedere like, commenti, tag | Il coinvolgimento spinto abbassa il valore percepito di un marchio di lusso | Park, Im & Kim 2020 |
| Un soggetto, pochi colori, aria | La complessità visiva e cromatica abbassa lo status percepito | Adam & Wen 2026; J. Brand Management 2018 |
| Ingrediente e metodo, niente aggettivi di lode | I menu costosi citano la provenienza; le lodi vaghe seguono i prezzi bassi | Jurafsky |
| La mano dello chef che tocca il cibo | Il tocco aumenta il senso di possesso e il valore percepito | Luangrath et al. 2022 |
| Movimento implicito (versare, vapore, gesto) | Aumenta freschezza e attrattiva percepite | Gvili et al. 2015 |
| Il cibo e il mestiere al centro | Criteri delle stelle Michelin | Guida MICHELIN |
| Costanza: mai un post debole tra due buoni | Criterio delle stelle Michelin | Guida MICHELIN |
| Voce da padrone di casa | Valori Relais & Châteaux; peso del servizio in Forbes | fonti citate |
| Aprire con l'immagine migliore, chiudere sul piatto servito | Effetto primacy e regola picco-fine | psicologia cognitiva, non riverificato qui |
| Niente che l'ospite non troverà | Gli ispettori confrontano la promessa con la tavola | Guida MICHELIN; regola interna |

I risultati di ricerca vengono dagli abstract, non dalla lettura integrale degli articoli.

## Come viene applicato

1. **Autore** (`scripts/author.ts`): voce, immagini, struttura, limiti e parole vietate entrano
   nel prompt. Un testo che viola lo standard viene rimandato indietro (fino a tre tentativi).
2. **Revisore**: guarda ogni foto accanto al suo testo. Un testo sbagliato viene accorciato o
   tolto, mai sostituito da una descrizione di forme e colori. Una foto impubblicabile
   (screenshot, interfaccia di un'app, watermark, ospiti riconoscibili, collage) viene esclusa
   per sempre in `data/asset-overrides.json` e il post viene riscritto senza.
3. **Regola del silenzio**: le righe facoltative che violano lo standard vengono rimosse; la
   foto parla da sola.
4. **Gate** (`src/lib/gate-io.ts`): ciò che resta fuori standard blocca render e pubblicazione
   con l'errore `house standard, <campo>: <motivo>`.

Limiti attuali: titolo 7 parole, testo di scena 6, titolo slide 6, corpo slide 16, didascalia
480 caratteri, 5 hashtag.

## Calendario editoriale

La casa vende due esperienze private: la lezione di cucina e lo chef a domicilio. L'offerta di
finger food e catering per eventi è stata ritirata l'11 novembre 2026 (formato `A3-menu-list`
disattivato, post in coda ritirato da Buffer).

Regole, in `content/house-standard.json` alla voce `calendar`:

- una settimana si legge come un menu degustazione: mai lo stesso formato due volte di
  fila, le due esperienze si alternano;
- un giorno senza post è meglio di un post sotto standard: se il materiale non basta, lo
  slot resta vuoto;
- al massimo un post su sette chiede apertamente la prenotazione;
- stessa ora ogni volta;
- i temi vengono da stagioni e prodotti: niente tendenze, meme, ricorrenze prese in prestito;
- italiano e inglese si alternano.

Le prime quattro sono verificate dal codice (`calendarIssues` in `src/lib/autopilot.ts`,
eseguito da `npm run validate:data`): formati ritirati o sconosciuti, ripetizioni, un servizio
assente o sopra il 60% degli slot, post di vendita sopra il 15%.

Rotazione attuale (7 slot): serie dello chef, processo della lezione, tavola privata, chef al
lavoro, tavola privata, serie dello chef, prova e invito.

Per ritirare un post già in coda:
`node --env-file-if-exists=.env scripts/unschedule.ts <slug> --reason "motivo"`.

## Nomi dei piatti

`content/dishes.json` contiene i nomi confermati dallo chef, per foto:

```json
{ "names": { "IMG_0112": { "it": "Arancinette al ragù", "en": "Arancinette with ragù" } } }
```

La chiave è il nome originale della foto senza estensione. Solo questi nomi possono comparire
nei testi. Senza nome il sistema non descrive il piatto. Più nomi conferma lo chef, più i post
possono parlare come un menu.

## Cosa lo standard non può fare

Non migliora il materiale. L'archivio è fatto in gran parte di foto da telefono di buffet; le
regole visive dicono cosa scegliere, ma poche foto le rispettano. Servono riprese nuove: mani
dello chef, un piatto alla volta, luce naturale, clip verticali di 5-8 secondi.
