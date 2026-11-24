# Manual do Mestre: Tag & Tally no Foundry VTT

Guia rápido para mesas com vários Mestres (ou Mestres que se revezam) usando o sistema
Tag & Tally no Foundry VTT v14. Pressupõe que o mundo já está criado com o sistema instalado.

## 1. A ideia em um parágrafo

Em Tag & Tally tudo é **uma frase e um nível**. Um personagem é "*Nome* é um(a) [descritor]
[espécie] [tipo] que [especialidade]". Cada colchete é uma **tag**; tags facilitam ou
atrapalham tarefas. Toda tarefa tem um **nível** de 1 a 10 e a **CD é 3 × nível**. Rola-se
sempre **1d20**: 1 é "Falha, e…"; até CD-6 "Falha, mas…"; CD-5 a CD-1 "Sucesso, mas…"; CD a
CD+4 "Sucesso"; CD+5 ou mais "Sucesso, e…". Não há pontos de vida: dano é uma **trilha de
ferimentos**. Não há XP: tags sobem de grau por **marcas** (um 1 ou 20 natural enquanto a
tag é usada). O sistema automatiza tudo isso; o Mestre decide o nível e narra.

## 2. Preparando o mundo

- **Idioma**: Configurações do Foundry → Idioma → Português (Brasil). Os conectivos das
  frases geradas seguem o idioma; o conteúdo das tabelas do Sparks (o que fica entre
  colchetes) permanece em inglês.
- **Nível padrão das tarefas** (Configurações do sistema): use 3 em mundos novos.
- **Nível da cena**: em cada cena, Configurar → aba Básico → "Nível da cena (Tag & Tally)".
  Todas as rolagens naquela cena começam nesse nível e as criaturas geradas nascem com ele.
  Mude o nível quando a história esquenta; é o principal dial do Mestre.
- **Marcas automáticas**: deixe ligado. Em um 1 ou 20 natural o sistema já marca as tags.
- **Ocultar forças e fraquezas**: deixe ligado. Jogadores só veem quando revelado.
- **Módulos recomendados**: Bar Brawl (barras de vitalidade e esforço nos tokens), Health
  Estimate (texto de gravidade ao passar o mouse), Dice So Nice, e a família Augur
  (Nexus, Hexlands, Fantasy, Instant Dungeons) para o mundo. Item Piles é opcional: o
  sistema tem sua própria janela de **Negociar**.
- **Botões do sistema**: nos controles de token (coluna esquerda) há três botões extras:
  **Sparks** (varinha), **Fluxo de combate** (espadas) e **Visão do grupo** (pessoas).

## 3. Criando personagens com os jogadores

1. Crie um Ator do tipo **Personagem** e dê posse ao jogador.
2. Clique na **varinha** ao lado do nome. Ela gera um personagem completo: frase, tags de
   cada fase da vida até a fase atual (Adulto por padrão), quatro itens, uma missão
   pessoal (arco), aparência e nome. Nada de magias: quem quiser ser conjurador adiciona.
3. Cada campo da frase tem um **dadinho** que sorteia só aquele campo. Nas abas **Tags**,
   **Fases da vida**, **Inventário** e **Missões**, cada linha gerada tem o mesmo dadinho.
   Clicar na varinha de novo refaz tudo (pede confirmação).
4. Peça ao jogador para **editar o que não gostou**: renomear tags, trocar a especialidade,
   escrever a biografia. A ficha é o ponto de partida, não a prisão.
5. **Graus e marcas**: na aba Tags, os pontinhos definem o grau (G1 a G4) e as caixinhas
   são marcas. Cinco marcas sobem um grau; cinco no grau 4 marcam a tag como dominada.
6. **MAI** (Índice de Aptidão Mágica): "IAM base" na aba Principal (0 para quem não é
   mágico; 3 é um bom começo para espécies ou tipos mágicos) mais 1 por tag mágica da
   frase. Tags cujo nome parece mágico (mago, arcano, bruxa…) já vêm marcadas; para outras,
   abra a tag e marque "Mágica".
7. **Riqueza** começa em 3 ("Confortável"). Os botões − e + no cabeçalho ajustam.

Ferramentas: a aba **Fases da vida** mostra o que cada fase deu e permite sortear mais
antecedentes, perícias, defeitos ou ocupações por fase. A **Visão do grupo** mostra todos
os personagens dos jogadores numa tabela (frase, ferimentos, riqueza, IAM, carga).

## 4. Rolando tarefas

Clique em **Rolar** no cabeçalho da ficha, ou no ícone de qualquer tag ou item. No diálogo:

- **Nível da tarefa** já vem da cena. Mude se a tarefa específica for mais fácil ou difícil.
- **Tipo de rolagem**: Tarefa é o padrão; os outros (abordagem de PdM, navegação, rastreio,
  colheita, criação…) mudam só o texto de resultado que aparece no cartão.
- Marque as **tags** que facilitam (seta para baixo) ou atrapalham (seta para cima).
  Defeitos já vêm como "atrapalha".
- Marque **equipamentos** como recursos (máximo dois contam).
- O sistema aplica o **limite de tags** por nível (2 até nível 3, 3 até 6, 4 até 8, 5 acima)
  e mostra o que foi ignorado. Atrapalhos não têm limite.
- O cartão no chat mostra o d20, a faixa de resultado, as tags usadas e as marcas ganhas.

**Oráculo** (janela Sparks, aba Oráculo): pergunta com probabilidade de 1 a 10, ou um d6
de sim/não. Ótimo para quando nenhum Mestre sabe a resposta.

## 5. Ferimentos

Quatro trilhas: **Esforço** (5), **Trauma Persistente** (3), **Lesão Debilitante** (2),
**Cicatriz Permanente** (3). Trilha cheia transborda para a próxima. Três cicatrizes
encerram a carreira: aposentar ou morrer.

- Na ficha, clique nas caixinhas para marcar ou limpar. O **+** ao lado da trilha aplica um
  ferimento com transbordo e gera uma **frase de ferimento** (o que ele atrapalha).
- O cabeçalho mostra a gravidade (Ileso, Esforçado, Traumatizado, Lesionado, Marcado) e o
  pior ferimento ativo. O Health Estimate mostra o mesmo ao passar o mouse no token.
- **Descanso** (aba Ferimentos): zona segura cura todo o esforço, ou 1 trauma, ou rebaixa
  1 lesão para trauma. Tratamento em campo e profissional são rolagens normais (nível 5 e 3).
- **Rolar ferimento**: um clique resolve direto o ferimento de um confronto sem passar pelo
  fluxo de combate. Use quando a cena pede rapidez.

## 6. Combate

O SRD descreve cinco fases, cada uma uma rolagem: **Abertura, Manobra, Ataque,
Contra-ataque, Resolução**. A janela **Fluxo de combate** acompanha isso por participante.

- Adicione tokens selecionados ou os combatentes do rastreador. Defina o nível do oponente
  (ou selecione o token inimigo e clique na mira).
- **Qualquer fase pode ser rolada em qualquer ordem** e rolada de novo. Abertura alimenta a
  Manobra; Manobra alimenta Ataque e Contra-ataque; esses dois alimentam a Resolução. O
  modificador acumulado aparece em cada fase com a CD resultante.
- Quer rapidez? Pule direto para **Resolução** ou use **Rolar ferimento**. Um combate
  completo de cinco rolagens é para momentos épicos, não para toda escaramuça.
- Armadura equipada facilita automaticamente o Contra-ataque (leve 1, média 2, pesada 3).
- Resolução: Falha e… = Cicatriz; Falha mas… = Lesão; Sucesso mas… = Trauma; Sucesso =
  Esforço; Sucesso e… = ileso. O botão **Aplicar ferimento** marca a trilha e gera a frase.
- O estado do fluxo é **compartilhado**: qualquer Mestre ou jogador vê o mesmo painel.

## 7. Magias

Aba **Magias** → **+ Magia**. O construtor segue o SRD: escolha **base** (Ordem, Espírito,
Vazio, Caos), **aspectos** e **tipos** (mais de um aspecto ou tipo exige Caos), **alcance**
(MP), **artefato** (ritual, codificada, canalizada, manifestação) e **gatilho**. Pontos,
nível e CD são calculados na hora. O Sparks tem um gerador de **Magia** aleatória.

Ao **conjurar** (ícone de d20), o sistema aplica o teste de IAM (magia no nível do IAM ou
acima atrapalha 1 a 3 passos), o modificador do artefato, sobrecarga e magia de sangue.
"Falha, e…" oferece o botão **Rolar acidente**.

## 8. Missões e arcos

Aba **Missões**. Cada missão tem marcas de **Plano**, **Local** e **Contagem regressiva**.
Completar Plano ou Local reduz a Contagem em 1. A rolagem de resolução (ícone de d20) é
facilitada com Plano completo e atrapalhada por cada marca faltante. Marque "Arco do
personagem" para a missão pessoal; resolver um arco rende uma tag nova. O Mestre decide
quando uma missão começa: quando o resultado mudaria o personagem ou a situação.
- **Passos e marcas seguem o SRD**: marcar um passo preenche o Plano e limpa uma marca da
  Contagem; completar o Plano ou o Local limpa uma marca da Contagem. O Sparks preenche
  objetivo, recompensa e consequência pelas tabelas de inspiração; edite à vontade.

## 9. PdMs e criaturas

- Crie um Ator **PdM / Criatura**. Marque **Criatura** para monstros (frase de disposição,
  tipo, motivação, ataque, habilidade especial) ou deixe desmarcado para pessoas (descritor,
  espécie, tipo, motivação, o que quer, segredo).
- A **varinha** no cabeçalho gera a frase inteira com o Sparks. O nível vem da cena.
- **Oculto dos jogadores**: só a frase básica aparece no início. Motivação, desejo, ataque e
  tipo de dano (e a habilidade especial de uma criatura) aparecem quando você clica no olho ao
  lado do campo, por exemplo depois de vê-la lutar. A **força** e a **fraqueza** de uma
  criatura e o **segredo** de um PdM também se revelam quando os jogadores juntam 5
  **insights** (caixinhas ao lado). As partes ocultas aparecem como [?] na frase. O que foi
  revelado pertence ao ator do mundo: todos os tokens de lobo no mapa compartilham, mesmo que
  cada token tenha a própria frase editada.
- **Negociar**: botão na aba Principal do PdM. Escolha o comprador; comprar abaixo da
  riqueza é livre, no nível ou acima exige teste de Riqueza (nível 3 + diferença) e, em
  sucesso, o jogador escolhe perder 1 de Riqueza ou ficar **Endividado**. Vender funciona ao
  contrário. Não precisa do Item Piles; se usar Item Piles, marque "Mercador".
- **Moedas** (opcional, configuração do sistema "Modo moedas"): moedas são marcas rumo ao
  próximo nível de Riqueza. 10 moedas levam de 0 a 1, 100 de 1 a 2, 1000 de 2 a 3. Ao
  juntar o suficiente o nível sobe sozinho; a seta para baixo no cabeçalho **saca** um nível
  em moedas para gastar. Itens custam 10^custo moedas (custo 2 = 100). O Item Piles usa as
  moedas como dinheiro das pilhas e lojas.
- Tokens de PdM não são vinculados por padrão: tags adicionadas ao ator do mundo depois de
  colocar o token são lidas automaticamente pelo diálogo de rolagem.

## 10. Relações e conversas com PdMs

- A aba **Relações** lista as facções, pessoas e lugares que o personagem conhece. Arraste
  um ator PdM, um ator Facção, um diário do Augur Nexus ou qualquer entrada de diário para
  a ficha. Cada linha guarda a **disposição** do SRD (Hostil a Devoto) e as marcas de
  relação; cinco marcas movem a disposição um degrau.
- **Interagir** (botão na linha da relação ou na ficha do PdM) conduz uma conversa do SRD: a
  atitude **Drift** do PdM é rolada uma vez por cena (2d6), depois você escolhe uma
  **abordagem** e uma pergunta. O modificador da disposição entra na rolagem e a faixa do
  resultado grava a consequência na relação (marca, degrau de disposição ou favor devido).
- Todo cartão de chat tem um botão **Registrar no diário** que o anexa ao diário "Sparks",
  para os resultados da conversa ficarem com as notas da campanha.

## 11. O ciclo de jogo

- Abra o **Ciclo de jogo** pelos controles de token ou pelo macro e **Adicionar grupo**. É
  compartilhado, então uma mesa por postagem vê a mesma cena.
- **Rolar a cena**: o nível vem da última cena pela fórmula do SRD, a frase do Sparks, e hora
  do dia, clima e estação das tabelas; cada um tem seu próprio rerolar. **Definir como nível
  da cena** copia o nível para a cena atual do Foundry.
- Escolha o **escopo de tempo**: uma luta, algumas horas, um dia, uma semana, um mês ou um
  ano. Ele diz quanto tempo do mundo passa quando a cena encerra, não quantas ações ela tem.
  Escreva a **intenção** e os **riscos**, e escolha a **missão** que a cena serve (ou
  nenhuma: o tempo só passa).
- Cada personagem tem **10 ações** na cena, e uma ação é gasta quando uma rolagem resolve,
  onde quer que seja rolada: uma Tarefa na ficha, uma fabricação na Oficina, uma rolagem de
  Interagir, a Resolução do Fluxo de combate (as quatro fases antes dela são livres). Abrir
  uma ferramenta não custa nada; a seta ao lado das caixas devolve a última ação.
  **Investigar** pergunta o que você investiga (Plano ou Local de uma missão, um traço oculto
  de PdM, uma facção), rola insights no nível 5 e marca o alvo pelo resultado. **Tarefa**
  rola no nível da cena, **Socializar** escolhe um PdM e abre Interagir, **Oráculo** faz uma
  pergunta, o resto abre suas ferramentas. O **+** ao lado do seletor de missão cria uma
  missão em um personagem. Com o Simple Calendar ativo, a data aparece no cabeçalho e Avançar
  o tempo a move pelo escopo.
- Quando um jogador termina, clica em **Pronto**. **Avançar o tempo** libera quando todos
  estão prontos (o Mestre sempre pode avançar). Isso escreve a cena no diário **Crônica da
  campanha** (intenção, riscos, missão, registro), move o contador de dias pelo escopo (tags
  do dia seguinte somem, pontos de descanso recarregam), marca a contagem de fase de cada
  facção (uma marca para um dia ou uma semana, duas para um mês, três para um ano) e rola a
  próxima cena. A missão continua.

## 12. Descanso (tempo livre)

- Abra o **Descanso** pelos controles de token, pela aba Ferimentos ou pelo macro. É
  compartilhado: todos veem a mesma noite. Adicione os personagens uma vez; cada um recebe
  **4 pontos** por noite.
- Cada botão de atividade gasta uma hora e aplica o efeito do SRD: **dormir** dá
  [Descansado] (e a cura de descanso em zona segura), **pesquisa / estudo / treino /
  meditação** colocam marcas em tags e missões, **socializar** marca uma relação, **jantar /
  beber** dão [Bem alimentado] / [Coragem Líquida] com [Ressaca] e [Músculos Doloridos] como
  preço, **apostar** joga contra a marca de riqueza, **vigília** alimenta os testes de
  encontro da viagem, **criar / reparar** abrem a Oficina.
- As tags do dia seguinte somem ao apertar **Novo dia**, que também recarrega os pontos de
  todos. Marque **Zona segura** quando o grupo dorme em lugar seguro.

## 13. Viagem

- Abra a **Viagem** pelos controles de token ou pelo macro. Mova o grupo no mapa você mesmo
  (hexes do Augur Hexlands, um mapa desenhado ou nada); o rastreador não conta movimento.
- Quando estiverem num hex novo, aperte **Explorar hex**: nível (a partir do hex que
  deixaram), característica, marco e evento vêm das tabelas do Sparks. O terreno é o que o
  mapa mostra. Cada resultado tem seu próprio dado de **rerolar**, então qualquer um pode pescar uma ideia
  melhor. **Enviar ao chat** compartilha o hex com os jogadores; **Definir como nível da
  cena** copia o nível para a cena atual.
- **Ermo / urbano / masmorra** só escolhem as tabelas: urbano rola características de
  distritos, masmorra rola tamanho, saídas e conteúdo da sala.
- **Descansar** rola os testes de encontro 2d6 do SRD, um por rodada do grupo menos os
  personagens que fizeram vigília.

## 14. Ofício: a Oficina

- Abra a **Oficina** pela aba Inventário, pelos controles de token, pelo macro ou pelas horas
  de criar / reparar do Descanso. Uma janela por personagem, quatro abas.
- **Colher**: escolha o nível da fonte, o tipo de recurso (d8) e a raridade (d4). Sucesso
  cria um item de recurso; a faixa sobe ou desce o nível.
- **Fabricar**: escolha um material base do inventário e, opcionalmente, um componente
  mágico. A tarefa é (nível + raridade) x 3. Sucesso pede a frase do item (pré-preenchida
  pelas tabelas de equipamento do Sparks, com o material vindo da base) e cria equipamento
  Nível 1 a Custo 3 (Nível 2 com componente raro ou lendário), consumindo os materiais.
- **Aprimorar / Consertar**: adiciona uma tag ao item (+1 nível, +2 com material raro ou
  lendário), limpa a marca **quebrado** ou aplica uma **propriedade recuperada** como tarefa
  Nível 5. Um item aceita no máximo 9 aprimoramentos.
- **Recuperar**: destrói um item mágico para guardar uma de suas propriedades (duas em
  Sucesso-e) como recurso recuperado.
- Cada nova tentativa no mesmo alvo é dificultada em 2, mostrado na linha da tarefa; a seta
  de reiniciar limpa quando a fonte muda. Os resultados são anexados ao cartão da rolagem.

## 15. Facções

- Crie um ator **Facção**. A frase ("uma [descritor] [organização] que [função] e
  [objetivo]; apesar da reputação, eles [segredo]") vem da **varinha** ou de um diário de
  facção do Augur Nexus (**Importar** no cabeçalho, ou solte o diário na ficha): tipo e
  disposição preenchem organização e descritor, os princípios de Propósito, O Mundo e
  Autoridade preenchem função, objetivo e segredo, e impulso, ação, tema e foco viram
  **tags**. Solte um local do Augur, uma cena ou página de site na ficha para definir o
  **quartel-general**; solte outra facção para adicionar um **rival**. Objetivo, segredo e
  quartel-general ficam ocultos até você clicar no olho.
- O **relógio de fases**: sete fases, de Sombras a Fim. Cada **Insight** que os jogadores
  ganham marca uma casa; cinco completam a fase e publicam um cartão (sussurrado aos
  Mestres até o objetivo ser conhecido). Quando os jogadores conhecem o objetivo, a
  **contagem** de 10 corre; se ela enche primeiro, a facção é frustrada e sua marca zera.
- **Rivais**: um insight sobre a facção A também avança a contagem de cada rival, e quando A
  completa uma fase a marca de cada rival é sabotada a zero.
- A visão geral **Facções** (controles de token ou macro) lista todas as facções com botões
  de Insight e Contagem, um **Tempo passa** que marca todas, e os diários do Augur ainda não
  importados. Soltar uma facção na ficha de um personagem a adiciona às Relações.

## 16. Sparks: o motor de improviso

Botão **Sparks** nos controles de token. Três abas:

- **Geradores**: PdM, espécie, tipo, aparência, criatura, armadura, item, arma, armadilha,
  consumível, recurso, cena, local, masmorra, covil, sala, missão, facção, insight, magia,
  ferimento. Escolha o **tema** (fantasia, moderno, caçador de monstros). Cada resultado
  tem botões: enviar ao chat, copiar, **criar ator**, **criar item** (vai para a ficha
  aberta no momento) ou **criar entrada de diário** (pasta "Sparks").
- **Tabelas**: mais de 550 tabelas para rolar uma a uma. **Importar como RollTables** copia
  tudo para o mundo em subpastas; qualquer RollTable com o mesmo nome de uma tabela
  substitui a original. É assim que você personaliza o conteúdo para o seu cenário.
- **Oráculo**: perguntas de sim/não com probabilidade.

Dica: gere uma **cena** no início de cada sessão e uma **facção** sempre que os jogadores
perguntarem "quem manda aqui?".

## 17. Sparks com o Augur

O Augur é agnóstico de sistema; a única parte que não funciona é a loja (Fantasy/Sci-Fi),
que só conhece D&D 5e, PF2e, Shadowdark e OSE. Use a Negociação do sistema no lugar.

Fluxo sugerido para construir o mundo em conjunto:

1. **Hexlands** gera a região. Para cada hex importante, gere um **Local** ou **Masmorra**
   no Sparks e crie a entrada de diário; ligue-a ao Site no **Nexus**.
2. **Instant Dungeons** gera a planta; o Sparks gera **salas**, **covis** e **armadilhas**
   para povoar e o gerador de **criatura** para o chefe. Criaturas geradas nascem com o
   nível da cena.
3. **Augur Fantasy** cuida de assentamentos e facções no mapa; o gerador de **facção** do
   Sparks dá o segredo e o objetivo. Guarde tudo na pasta de diários "Sparks" e vincule
   no Nexus.
4. Para cada PdM relevante, gere pelo Sparks, crie o ator e arraste para o Nexus como
   Pessoa. Os segredos ficam ocultos até serem descobertos.
5. No caminho inverso, toda ficha de personagem e PdM tem um botão **Augur** no
   cabeçalho: atores vinculados abrem seu dossiê no Nexus (o botão de importar ao lado
   atualiza a frase a partir de descritor, ancestralidade, papel e impulso, traços e crenças
   como tags, retrato e pronome); um ator sem vínculo pergunta qual pessoa do Augur ele é,
   depois vincula e importa.

## 18. Jogando solo

O Foundry exige um usuário Mestre, então quem joga solo joga como Mestre. Ligue a
configuração **Véu solo**: forças, fraquezas e segredos de PdMs e objetivos, segredos e
quartéis-generais de facções ficam ocultos também para você, mostrados como *Desconhecido*
até as cinco caixas de insight encherem, o botão de Insight da facção revelar o objetivo,
ou você clicar no olho porque a ficção mereceu. A varinha do Sparks e os botões do Augur
continuam preenchendo esses campos; você só não vê o que escreveram. A biografia gerada do
PdM não repete mais a frase.

Uma sessão solo na prática roda no **Ciclo de jogo** (seção 11): role a cena, declare
intenção e riscos, gaste ações (Oráculo, Investigar, Socializar, Viagem, Combate), depois
Avance o tempo. Todo o resto acontece pelas ferramentas que ele abre.

## 19. Jogando com vários Mestres

O sistema não impõe quem é "o" Mestre: qualquer usuário Mestre pode fazer tudo. O que
funciona bem na prática:

- **Um Mestre narrador por cena**, definido antes de começar. Ele controla o nível da cena
  e os segredos. Os outros Mestres atuam como **jogadores ou coadjuvantes** naquela cena.
- **Um Mestre de apoio** cuida do Sparks: gera PdMs, salas e complicações quando o narrador
  pede, e cria as entradas de diário. Evita que o narrador pare para rolar tabelas.
- **Passagem de bastão**: ao trocar de narrador, o anterior deixa a cena com nível definido,
  os PdMs relevantes na cena e um parágrafo no diário "Sparks" com o estado. O próximo lê e
  segue, mantendo os segredos já revelados (olho aberto na ficha do PdM).
- **Decisões disputadas** entre Mestres: use o **Oráculo** e aceite o resultado. Os
  jogadores vendo o d20 cair resolve a discussão.
- **Estado compartilhado**: fluxo de combate, nível da cena, revelação de segredos e as
  tabelas importadas valem para todos. Não há "minha versão" das tabelas: quem edita uma
  RollTable edita para a mesa inteira.
- **Convenções**: prefixo no nome de atores de teste ("ZZ"), pasta de diários por região,
  cenas com o nível no nome ("Ruínas de Kael (N5)"). Combine se marcas de tags podem ser
  concedidas fora do 1/20 natural (o SRD diz que não).
- **Jogo por postagem (PbP)**: cada Mestre resolve as rolagens dos jogadores na sua janela
  de tempo; o cartão de chat é o registro. Deixe as marcas automáticas ligadas e peça aos
  jogadores para rolarem eles mesmos, com título preenchido ("Escalo o muro").

## 20. Atalhos e macros

- Na primeira abertura o sistema cria a pasta de macros **Tag & Tally** com um macro para
  cada ferramenta: arraste-os para a barra de atalhos.
- Arraste uma tag, item, magia ou missão da ficha para a **barra de atalhos**: o macro abre
  a rolagem certa.
- Para escrever os seus, o prefixo é sempre `game.tagandtally.macros.`: `rollTask()`,
  `quickRoll(5)`, `oracle(7, "Tem guardas?")`, `openSparks()`, `openCombatFlow()`,
  `openParty()`, `openBarter()`, `openGameLoop()`, `openDowntime()`, `openTravel()`, `openWorkshop("craft")`,
  `openFactions()`, `generateNPC()`, `generateCreature()`,
  `generateJournal("dungeon")`, `randomCharacter()`, `importSparkTables("creature")`.

## 21. Checklist de sessão

1. Nível da cena definido.
2. Narrador da cena escolhido; Mestre de apoio com o Sparks aberto.
3. PdMs da cena na pasta certa, segredos ocultos.
4. Fluxo de combate limpo (lixeira) antes da primeira luta.
5. Facções marcadas (**Tempo passa**) se o dia avançou.
6. No fim: descanso aplicado, noite de Descanso jogada, missões atualizadas, parágrafo
   de passagem no diário.

Boa sessão.
