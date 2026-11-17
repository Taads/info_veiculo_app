import type { DocInfo, DocKind } from '@/store';
import type { Tone } from '@/theme';

export const docKindMeta: Record<DocKind, { label: string; short: string; icon: string; tone: Tone }> = {
  crlv: { label: 'Documento do carro (CRLV)', short: 'CRLV', icon: 'card-account-details-outline', tone: 'accent' },
  cnh: { label: 'CNH', short: 'CNH', icon: 'card-account-details-star-outline', tone: 'blue' },
  seguro: { label: 'Apólice do seguro', short: 'Seguro', icon: 'shield-car', tone: 'violet' },
  nota: { label: 'Nota fiscal', short: 'Nota', icon: 'receipt-text-outline', tone: 'green' },
  outro: { label: 'Outro documento', short: 'Outro', icon: 'file-document-outline', tone: 'neutral' },
};

export const emptyDocInfo = (): DocInfo => ({
  renavam: '',
  chassi: '',
  brandModel: '',
  yearFab: '',
  yearModel: '',
  color: '',
  fuel: '',
  category: '',
  city: '',
  uf: '',
  exercicio: '',
  owner: '',
});

export function docInfoFilled(info?: DocInfo): number {
  if (!info) return 0;
  return Object.values(info).filter((x) => x.trim()).length;
}
