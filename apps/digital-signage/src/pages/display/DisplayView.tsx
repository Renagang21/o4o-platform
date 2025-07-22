import { useParams } from 'react-router-dom';
import LiveTVDisplay from '../LiveTVDisplay';

export default function DisplayView() {
  const { storeId } = useParams();

  return <LiveTVDisplay storeId={storeId} />;
}