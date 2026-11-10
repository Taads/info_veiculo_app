# 🚗 Garagem — info_veiculo_app

App Android para cuidar do carro sem esquecer nada: troca de óleo, revisões, IPVA e seguro, com lembretes no celular mesmo com o app fechado.

Feito com **Expo (SDK 58)**, **React Native** e **Expo Router**. Os dados ficam salvos só no próprio celular.

## Funcionalidades

- **Hodômetro e km do dia**: registre os km rodados no dia ou o valor do painel. O app calcula a sua média de km por dia.
- **Troca de óleo**: intervalo por km ou por meses (o que vencer primeiro), com previsão da data pela sua média.
- **Revisões**: plano de revisões em linha do tempo, com valor pago, oficina e histórico.
- **IPVA e seguro**: informe o valor e compare de **1x a 12x**, com juros ao mês, "sem juros até Nx" e desconto à vista. Cada parcela pode ser marcada como paga.
- **Notificações locais**: avisos de vencimento (7 dias antes, 1 dia antes e no dia), de óleo e revisão chegando, e um lembrete diário para registrar os km.
- **Vários carros**: cadastre mais de um e alterne entre eles.

## Como rodar

```bash
npm install
npx expo start
```

Depois, escaneie o QR code com o app **Expo Go** no Android (celular e PC no mesmo Wi-Fi).

## Estrutura

```
src/
├── app/          # telas (Expo Router)
│   ├── (tabs)/   # Início, Manutenção, Pagamentos, Garagem
│   ├── pagamento/
│   └── revisao/
├── components/   # componentes visuais reutilizáveis
├── lib/          # regras (previsões, notificações)
├── store/        # dados salvos no celular (zustand + AsyncStorage)
├── utils/        # datas, formatação e cálculo de parcelas
└── theme.ts      # cores, fontes e espaçamentos
```

## Próximos passos

- Abastecimentos e consumo (km/l)
- Gastos por mês com gráfico
- Outros lembretes: licenciamento, pneus, pastilhas, filtros, multas
- Fotos de documentos (CRLV, apólice, notas)
