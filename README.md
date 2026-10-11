# The Domain · strona

Strona studia The Domain (CEO aixkuba): jedna przewijana historia z przypiętymi scenami, tłem z białych kropek, które zmieniają kształt przy scrollu, i paskiem odtwarzacza na dole, który sam przewija stronę.

## Uruchomienie

To statyczna strona bez zależności. Wystarczy otworzyć `index.html` przez dowolny serwer, np.:

```
python3 -m http.server 8000
```

i wejść na http://localhost:8000. Nadaje się od razu na GitHub Pages, Netlify lub Vercel (katalog główny, bez budowania).

## Struktura

- `index.html`: gotowa strona (generowana, nie edytować ręcznie)
- `assets/runtime.js`: mały silnik, który montuje szablon strony
- `assets/img/`: screeny realizacji (Himera, Adriatico, Tirenders)
- `src/build.py`, `src/figs.py`: treść i układ scen
- `src/style.css`, `src/logic.js`: style i logika (scroll, kropki, autoplay)
- `src/export.py`: składa wszystko w `index.html`

## Zmiany

Edytuj pliki w `src/`, potem uruchom:

```
python3 src/export.py
```
