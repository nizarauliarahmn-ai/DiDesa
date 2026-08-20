import SharedSignatureBlock from './SharedSignatureBlock';

interface TTESignatureBoxProps {
  officerTitle: string;
  officerName: string;
  verifyUrl: string;
  nip?: string;
  dateStr?: string;
}

export default function TTESignatureBox(props: TTESignatureBoxProps) {
  return <SharedSignatureBlock {...props} />;
}