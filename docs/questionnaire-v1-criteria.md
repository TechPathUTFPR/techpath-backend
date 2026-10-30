# Critérios do Questionário de Afinidade v1

Fonte: “TechPath — Especificação do Questionário de Afinidade”, Product Owner, 27/10/2026.

## Catálogo versionado

O catálogo em `src/questionnaire/questionnaire-v1.criteria.ts` registra as seis áreas, nesta ordem estável: DEV, UX, QA, DSO, DAD e PRD. Cada área possui cinco perguntas estáveis (`AREA-01` a `AREA-05`), totalizando 30 afirmações.

Cada pergunta pertence exclusivamente a uma área, tem peso `1` e não usa pontuação invertida ou cruzada. A escala, apresentada na ordem fixa abaixo, tem valores internos de 0 a 4:

| Valor | Rótulo                 |
| ----- | ---------------------- |
| 0     | Nunca é verdade        |
| 1     | Nem sempre é verdade   |
| 2     | Às vezes é verdade     |
| 3     | Quase sempre é verdade |
| 4     | Sempre é verdade       |

## Limitações e integração futura

Este catálogo é uma definição estática para a v1. Ele não cria tabelas, seed, migrations, endpoints, módulos NestJS, persistência ou cálculo de resultados.

Uma integração futura deverá usar os códigos estáveis ao persistir áreas e perguntas, manter a associação exclusiva de cada pergunta à sua área e preservar o peso unitário da v1. O motor de cálculo e a integração com Prisma permanecem entregas independentes.
