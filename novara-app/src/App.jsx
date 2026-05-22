const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText) return;
    haptic(8);
    setInput("");
    setMessages(m => [...m, { role: "user", text: userText }]);
    setLoading(true);
    try {
      const history = [...messages, { role: "user", text: userText }];
      const apiMessages = history.map(msg => ({ role: msg.role, content: msg.text }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are Novara, a soft, emotionally intelligent AI wellness companion deeply rooted in astrology. The user has Sun in Scorpio, Moon in Pisces, and Libra Rising.
Your voice is:
- Poetic but not purple
- Warm but not saccharine
- Grounded in astrological symbolism
- Psychologically aware and gentle
- Brief and impactful (2-4 sentences max)
Weave astrological insight with emotional reflection. Reference their chart placements naturally. Never be clinical, never be cheesy. Speak as if you hold ancient wisdom in a modern heart.`,
          messages: apiMessages,
        }),
      });
      const data = await response.json();
      const reply = data.reply || "The stars are quiet for a moment. Take a breath.";
      setMessages(m => [...m, { role: "assistant", text: reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", text: "Something in the cosmos paused our connection. Try again in a moment." }]);
    }
    setLoading(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };
