import { PUBLIC_PB_URL } from '$env/static/public';
import PocketBase from 'pocketbase';

const pb = new PocketBase(PUBLIC_PB_URL);
// globally disable auto cancellation
pb.autoCancellation(false);
export default pb;
