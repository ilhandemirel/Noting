import PocketBase from 'pocketbase';
import { POCKETBASE_URL } from '../utils/constants';

const pb = new PocketBase(POCKETBASE_URL);

export default pb;
