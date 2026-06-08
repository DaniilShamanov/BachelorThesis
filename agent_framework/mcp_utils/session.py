import os
import asyncio, threading
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from utils import get_config

config = get_config()

class MCPSessionSync:
    """Manages a persistent MCP session, optionally for a specific browser."""

    def __init__(self, browser: str = "chromium"):
        self.browser = browser
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        self.session = None
        self._session_context = None
        self._stdio_context = None

    def _run_loop(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    async def _init_session(self):
        server_params = StdioServerParameters(
            command=config["playwright_mcp"]["command"],
            args=config["playwright_mcp"]["args"],
            env={**os.environ, "PLAYWRIGHT_BROWSER": self.browser,
                 **config["playwright_mcp"].get("env", {})}
        )
        self._stdio_context = stdio_client(server_params)
        read, write = await self._stdio_context.__aenter__()
        self._session_context = ClientSession(read, write)
        self.session = await self._session_context.__aenter__()
        await self.session.initialize()

    def start(self):
        future = asyncio.run_coroutine_threadsafe(self._init_session(), self.loop)
        future.result()

    def call_tool_sync(self, tool_name: str, params: dict) -> str:
        if not self.session:
            raise RuntimeError("MCP session not started")
        async def _call():
            result = await self.session.call_tool(tool_name, params)
            return result.content[0].text if result.content else "No output"
        future = asyncio.run_coroutine_threadsafe(_call(), self.loop)
        return future.result(timeout=30)

    def close(self):
        async def _close():
            if self._session_context:
                await self._session_context.__aexit__(None, None, None)
            if self._stdio_context:
                await self._stdio_context.__aexit__(None, None, None)
        asyncio.run_coroutine_threadsafe(_close(), self.loop).result()
        self.loop.call_soon_threadsafe(self.loop.stop)
        self.thread.join()