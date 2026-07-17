# Fix Report — review fixes pós Task 5-7/9

Duas correções de review aplicadas sobre o código já commitado (Tasks 1-9 completas).

## FIX 1 — `metadataBase` para OG/Twitter em URL absoluta

`app/layout.tsx`: adicionado `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")` ao `metadata` exportado (título/descrição mantidos, import de `Metadata` já existia). Verifiquei `node_modules/next/dist/docs/.../generate-metadata.md` (Next 16.2.10) antes de aplicar — `metadataBase` funciona igual às versões anteriores, tipicamente setado em `app/layout.tsx` para propagar a todas as rotas; sem breaking change aqui.

`.env.example`: adicionada a variável `NEXT_PUBLIC_SITE_URL` com comentário em pt-BR explicando o motivo (unfurl no LinkedIn).

## FIX 2 — filtro de linguagens por ano exato

`lib/github.ts`: o filtro de repositórios para agregação de linguagens trocou de `getUTCFullYear() >= year - 1` para `getUTCFullYear() === year`, restringindo a linguagens de repositórios efetivamente empurrados (`pushedAt`) no ano-alvo, não no ano-alvo-ou-anterior.

`lib/github.test.ts`: reforcei o teste "agrega GraphQL + REST em WrappedData" — adicionei um segundo node em `repositories.nodes` com `pushedAt: "2025-06-01T00:00:00Z"` (ano anterior ao ano-alvo 2026) e `languages.edges` contendo `COBOL` (size 5000, maior que qualquer linguagem do repo de 2026). Nova asserção: `expect(d.languages.some(l => l.name === "COBOL")).toBe(false)`. Nenhuma asserção existente foi enfraquecida.

Esse teste é significativo: com a lógica antiga (`>= year - 1` com `year=2026` → `>= 2025`), o repo de 2025 seria incluído e COBOL apareceria em `d.languages` (e, dado seu tamanho de 5000, provavelmente na posição 0, quebrando também `expect(d.languages[0].name).toBe("TypeScript")`). Com a lógica nova (`=== year`), o repo de 2025 é excluído e a asserção passa.

## `npm test`

```
> github-wrapped@0.1.0 test
> vitest run

 RUN  v4.1.10 C:/Users/Dev/Desktop/Projetos Pessoais/github-wrapped

 Test Files  5 passed (5)
      Tests  18 passed (18)
   Start at  09:59:47
   Duration  1.12s (transform 172ms, setup 0ms, import 283ms, tests 115ms, environment 2ms)
```

18/18 passam, incluindo a nova asserção anti-COBOL.

## `npm run build`

```
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 9.9s
  Running TypeScript ...
  Finished TypeScript in 5.6s ...
✓ Generating static pages using 3 workers (4/4) in 388ms
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /[username]
├ ƒ /api/og/[username]
└ ƒ /api/wrapped/[username]
```

Build limpo, sem warnings. Nenhum aviso de `metadataBase` ausente (esperado, já que agora está setado).

## Commit

1 commit (autor Ícaro Goggin, sem Co-Authored-By), arquivos: `app/layout.tsx`, `.env.example`, `lib/github.ts`, `lib/github.test.ts`, `.superpowers/sdd/fix-report.md`.

Mensagem: `fix: metadataBase para OG absoluto + filtro de linguagens por ano exato`

## Notas

- `.superpowers/sdd/progress.md` tinha uma mudança pré-existente não relacionada (registro das Tasks 1-9, provavelmente de uma rodada anterior) — deixada de fora deste commit por não fazer parte do escopo desta correção.
