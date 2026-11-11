# Direzione creativa, dal 2026-11-11

Linea di lavoro adottata dopo le istruzioni operative del titolare (direttore creativo,
custode del marchio, stratega dei contenuti). Lo standard della casa
(`content/house-standard.json`, `docs/house-standard.md`) resta l'autorità; questo documento
dice cosa si fa adesso, perché, e come si misura. Ogni voce è marcata VERIFICATO, DEDOTTO o
IGNOTO.

## Gerarchia degli obiettivi

1. Richieste qualificate e margine. 2. Desiderabilità e percezione di prezzo. 3. Copertura
tra viaggiatori americani e internazionali. 4. Invii e salvataggi. 5. Visite al profilo e
traffico. 6. Riconoscibilità. 7. Produzione sostenibile.

## Cosa è stato verificato l'11 novembre

- VERIFICATO: risthome.it non prenota. L'unica azione del sito è "Request Availability"
  (`/request-availability`, risposta 200). Le pagine `/cooking-classes` e
  `/private-chef-at-home` esistono. Gli ancoraggi `#classes` e `#private-chef` usati nei
  dati non esistevano.
- VERIFICATO: il sito pubblica prezzi ("From €100", "From €80"), la voce "Groups & Events",
  le parole "Luxury", "Exclusive", "award-winning", "Limited availability". Lo standard della
  casa le vieta nei contenuti e l'offerta eventi è ritirata: il sito e Instagram oggi dicono
  due cose diverse.
- VERIFICATO (docs/strategy-2026-11.md, 5 novembre): l'unico canale che vende è GetYourGuide.
- IGNOTO: manuale di marchio ufficiale (regole del logo, palette, tipografia). I valori in
  `src/brand/theme.ts` sono campionati dal logo, non una specifica approvata.
- IGNOTO: dati Insights di Instagram. Nessun post della nuova linea è stato ancora misurato.

## Decisioni

| Tema | Decisione | Perché |
|---|---|---|
| Invito | Uno solo, con le parole del sito: "Request availability on risthome.it (link in bio)" per entrambe le esperienze | "Book" prometteva una prenotazione che il sito non fa; le case di riferimento usano una richiesta |
| Link in bio | `risthome.it/request-availability` con UTM | È l'unica pagina che raccoglie una richiesta |
| Ritmo | Quattro pezzi a settimana (lunedì, mercoledì, venerdì, domenica), carosello come formato principale, solo pezzi alla maniera di A7 | Deciso dal titolare l'11 novembre; l'archivio è fatto di fotografie e non ci saranno riprese |
| Giudizio | Scheda su 100 punti, soglia 85, più quattro cancelli (standard, fatti, autenticità, permessi) | Un pezzo bello ma debole non esce; il punteggio è un giudizio editoriale, non una previsione |
| Condivisione | Il motivo per inviare un pezzo si guadagna, non si chiede | Lo standard vieta di chiedere invii, commenti, salvataggi |

## Scheda di valutazione

In `content/house-standard.json` alla voce `scorecard`; aritmetica in `src/lib/scorecard.ts`.
Aggancio 20, qualità visiva 15, racconto 15, rilevanza per il viaggiatore americano 15,
invio e scoperta 15, coerenza con la casa 10, chiarezza dell'invito 10. Sotto 85 il pezzo si
rivede o lo slot resta vuoto. Un cancello fallito o non controllato rifiuta il pezzo
qualunque sia il punteggio. `npm run validate:data` verifica che la scheda sommi a 100.

Prima applicazione a mano: `docs/reviews/a7-20261113.md` (64 su 100, da rivedere).

Non ancora fatto: il revisore automatico non assegna ancora i punteggi. Finché non lo fa, la
scheda si usa a mano sull'anteprima nella console.

## Priorità, in ordine

1. **Sito coerente con la casa** (titolare, sul sito): togliere "Groups & Events", allineare
   titolo e testi allo standard, decidere se i prezzi restano. Effetto atteso (ipotesi): più
   richieste per visita al profilo. Misura: richieste da `/request-availability` con UTM.
2. **Materiale nuovo senza riprese**: il titolare ha escluso riprese e servizi fotografici
   (docs/coordination.md). Restano due fonti: le foto che gli ospiti scattano a ogni lezione,
   chieste dopo l'esperienza con permesso scritto, e le fotografie dell'isola con licenza
   libera. Senza le prime i pilastri "ospiti" e "prova" restano vuoti.
3. **Revisore con la scheda**: far assegnare i punteggi al modello che già guarda foto e
   testi, salvarli accanto al post, mostrarli nella console.
4. **Prima misura**: sui primi quattro pezzi pubblicati, invii e salvataggi per account
   raggiunto, quota di copertura dagli Stati Uniti, visite al profilo, richieste. Confronto
   con la mediana dell'account, mai con altri profili.

## Ipotesi da provare (una alla volta)

- H1: un pezzo che apre sull'isola riceve più invii per copertura di uno che apre sul
  piatto (EXP-010, già scritto).
- H2: l'invito "Request availability" porta più clic sul link in bio di "Ask for a quote".
  Misurabile solo dopo che il link in bio porta alla pagina delle richieste.
- H3: una slide con una frase vera di un ospite (con permesso) alza i salvataggi rispetto
  alla slide di soli fatti. Servono le frasi approvate.
