# Proposta: fotografie degli ospiti, con permesso scritto

Del direttore creativo, 2026-11-11. Per il titolare (il messaggio e la scelta) e per la
sessione del codice (come si registra). È l'unica fonte di immagini nuove: non ci saranno
riprese, e per lo chef a domicilio restano circa sei fotografie che riempiono la pagina.

## Perché conta

Mancano del tutto tre cose che un viaggiatore cerca: la tavola con le persone, le mani al
lavoro durante la lezione, la prova che altri ospiti ci sono stati. Le fotografie degli
ospiti le portano tutte e tre. Ipotesi, da misurare: un pezzo con una fotografia vera di
ospiti riceve più invii per account raggiunto di uno di soli piatti.

## Il messaggio (da mandare il giorno dopo, da chi ha tenuto i contatti)

Dopo una lezione:

> Thank you for cooking with us yesterday. If you took photographs in the kitchen, we would
> love to see two or three of them. With your permission we may share one on our Instagram
> and website. If you are happy with that, reply "Yes, you may use them" and tell us whether
> to credit you by first name or not at all. If anyone in a picture would rather not appear,
> tell us and we will not use it.
>
> Giacomo and the RistHome kitchen

Dopo una cena a domicilio, la prima frase diventa: "Thank you for having us at your table
last night."

Regole del messaggio: una sola richiesta, nessun incentivo (né sconti né omaggi in cambio),
nessun sollecito se non rispondono.

## Che cosa serve per poter usare una foto

1. Il "sì" scritto di chi l'ha mandata, conservato (schermata o testo del messaggio, con data).
2. Il sì di ogni persona riconoscibile nella foto. Per i minori, del genitore; nel dubbio la
   foto non si usa.
3. Come vuole essere indicato l'ospite: nome di battesimo o niente.
4. La possibilità di ripensarci: se un ospite lo chiede, la foto esce dai pezzi futuri e, se
   possibile, il post viene tolto.

Questo è buon senso editoriale, non un parere legale. Chi segue la privacy per RistHome
dovrebbe confermare il testo e per quanto tempo conservare i messaggi.

## Come si registra (per la sessione del codice)

Oggi il gate accetta `people: "guests-consented"` nel manifest, ma non c'è scritto chi ha
dato il permesso né quando: su 219 voci del registro nessuna ha un campo di consenso.
Proposta di un file `data/consents.json`, una voce per fotografia:

```json
{ "sha256": "...", "from": "first name or initials", "date": "2026-11-20",
  "channel": "whatsapp", "scope": ["instagram", "website"], "credit": "first-name | none",
  "peopleCleared": true, "evidence": "path outside the repository", "withdrawn": null }
```

Il gate ammette una foto con ospiti solo se ha una voce non ritirata con `peopleCleared`
vero. La prova (la schermata) resta fuori dal repository: contiene dati personali.

## Selezione

Le foto degli ospiti passano dallo stesso giudizio delle altre: un soggetto, luce vera,
niente che la casa non stamperebbe. Una foto mediocre con permesso resta una foto mediocre.
