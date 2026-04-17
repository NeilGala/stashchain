import axios from  "axios";

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;
const PINATA_BASE_URL = "https://api.pinata.cloud";

export async function uploadImageToIPFS (file) {
    const formData = new FormData();
    formData.append ("file", file);

    const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
            app: "stashchain",
        },
    });
    formData.append("pinataMetadata", metadata);

    const response = await axios.post(
    `${PINATA_BASE_URL}/pinning/pinFileToIPFS`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET,
      },
    }
  );

  return response.data.IpfsHash;
}

export async function uploadMetadataToIPFS(metadata) {
  const response = await axios.post(
    `${PINATA_BASE_URL}/pinning/pinJSONToIPFS`,
    {
      pinataContent: metadata,
      pinataMetadata: {
        name: `StashChain-${metadata.name}-metadata`,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET,
      },
    }
  );

  return response.data.IpfsHash;
}

export function getIPFSUrl(hash) {
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
}