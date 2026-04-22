import os
import ssl
import sys

def init_ssl_bypass():
    """
    Conditionally initializes SSL bypass for corporate proxy environments.
    Strictly controlled by the VERIFY_SSL environment variable.
    Effectively disables all certificate verification in Python.
    """
    verify_ssl = os.environ.get("VERIFY_SSL", "true").lower() == "false"
    
    if verify_ssl:
        print(">>> AINGO: SSL Bypass detected (VERIFY_SSL=false). Initializing global monkeypatching...", file=sys.stderr)
        
        # 1. Global SSL Module Bypass (The most aggressive level)
        try:
            ssl._create_default_https_context = ssl._create_unverified_context
            print(">>> AINGO: Standard SSL context verification disabled.", file=sys.stderr)
        except Exception as e:
            print(f">>> AINGO: Warning - Failed to patch ssl module: {e}", file=sys.stderr)

        # 2. Force Global Environment Tweaks for non-python binaries/libraries
        os.environ["PYTHONHTTPSVERIFY"] = "0"
        os.environ["HF_HUB_DISABLE_XET"] = "1"
        os.environ["HF_HUB_VERIFY"] = "0"
        os.environ["REQUESTS_CA_BUNDLE"] = ""
        os.environ["CURL_CA_BUNDLE"] = ""

        try:
            import requests
            from requests.adapters import HTTPAdapter
            from urllib3.poolmanager import PoolManager
            import urllib3
            
            # 3. Disable urllib3 insecure request warnings
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            
            # 4. Monkeypatch urllib3 PoolManager directly to catch libraries not using Requests
            _original_init = PoolManager.__init__
            def patched_init(self, *args, **kwargs):
                kwargs['cert_reqs'] = ssl.CERT_NONE
                _original_init(self, *args, **kwargs)
            PoolManager.__init__ = patched_init

            # 5. Create a No-Verify Adapter for Requests
            class NoVerifyAdapter(HTTPAdapter):
                def init_poolmanager(self, connections, maxsize, block=False):
                    self.poolmanager = PoolManager(
                        num_pools=connections,
                        maxsize=maxsize,
                        block=block,
                        cert_reqs=ssl.CERT_NONE
                    )

            # 6. Monkeypatch Requests globally
            _original_session = requests.Session
            
            class NoVerifySession(requests.Session):
                def __init__(self, *args, **kwargs):
                    super().__init__(*args, **kwargs)
                    self.verify = False
                    self.mount("https://", NoVerifyAdapter())
                    self.mount("http://", NoVerifyAdapter())

            # Complete method override to be safe
            requests.Session = NoVerifySession
            requests.get = lambda url, **kwargs: _original_session().get(url, verify=False, **kwargs)
            requests.post = lambda url, **kwargs: _original_session().post(url, verify=False, **kwargs)
            requests.patch = lambda url, **kwargs: _original_session().patch(url, verify=False, **kwargs)
            requests.put = lambda url, **kwargs: _original_session().put(url, verify=False, **kwargs)
            requests.delete = lambda url, **kwargs: _original_session().delete(url, verify=False, **kwargs)
            requests.head = lambda url, **kwargs: _original_session().head(url, verify=False, **kwargs)
            
            print(">>> AINGO: Global Requests/Urllib3 SSL bypass active.", file=sys.stderr)
        except ImportError:
            print(">>> AINGO: Skipping requests/urllib3 bypass (libraries not installed).", file=sys.stderr)
    else:
        # Standard secure mode
        pass
