import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ScanResultView from '../components/ScanResultView';
import { api } from '../utils/api';

export default function Verify() {
  const [searchParams] = useSearchParams();
  const [scanStatus, setScanStatus] = useState('LOADING');
  const [assetData, setAssetData] = useState({});

  const result = searchParams.get('result');
  const reason = searchParams.get('reason');
  const uid    = searchParams.get('uid');

  // Claim handler
  const handleClaim = useCallback(async () => {
    const email = prompt('Enter your email to claim ownership:');
    if (!email) return;
    const data = await api('/api/claim', { method: 'POST', body: { tag_uid: uid, email } });
    if (data.success) {
      alert('Ownership claimed!');
      window.location.reload();
    } else {
      alert(data.error || data.message || 'Claim failed');
    }
  }, [uid]);

  // Transfer handler
  const handleTransfer = useCallback(async () => {
    const from = prompt('Your email (current owner):');
    if (!from) return;
    const to = prompt('New owner email:');
    if (!to) return;
    const data = await api('/api/transfer', { method: 'POST', body: { tag_uid: uid, from_email: from, to_email: to } });
    if (data.success) {
      alert(`Transfer initiated!\nToken: ${data.transfer_token}\nThe new buyer must tap the product, then accept.`);
    } else {
      alert(data.error || data.message || 'Transfer failed');
    }
  }, [uid]);

  useEffect(() => {
    if (!result) {
      setScanStatus('LOADING');
      return;
    }

    // Simulate decode delay for dramatic effect
    const timer = setTimeout(async () => {
      if (result === 'counterfeit' || result === 'error') {
        setScanStatus('ANOMALY');
        setAssetData({ reason: reason || 'unknown' });
        return;
      }

      if (uid) {
        try {
          const data = await api(`/verify/lookup/${uid}`);
          const enriched = {
            ...data,
            uid,
            reason,
            onClaim: handleClaim,
            onTransfer: handleTransfer,
          };

          if (result === 'suspicious') {
            setScanStatus('SUSPICIOUS');
          } else {
            setScanStatus('VERIFIED');
          }
          setAssetData(enriched);
        } catch {
          setScanStatus('ANOMALY');
          setAssetData({ reason: 'lookup_failed' });
        }
      } else {
        setScanStatus('ANOMALY');
        setAssetData({ reason: reason || 'missing_uid' });
      }
    }, 1800); // 1.8s decode animation

    return () => clearTimeout(timer);
  }, [result, reason, uid, handleClaim, handleTransfer]);

  return <ScanResultView scanStatus={scanStatus} assetData={assetData} />;
}
