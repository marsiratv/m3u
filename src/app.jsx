import React, { useState, useMemo } from 'react';
import { FileText, Download, Upload, Copy, Check, Plus, Trash2, Edit2, Save, Filter, Search, Link, Image, FolderOpen, CheckSquare, Key, Calendar, RefreshCw } from 'lucide-react';

export default function MediaPlaylistEditor() {
  const [channels, setChannels] = useState([]);
  const [rawContent, setRawContent] = useState('');
  const [viewMode, setViewMode] = useState('visual');
  const [copied, setCopied] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannels, setSelectedChannels] = useState(new Set());
  const [activeTab, setActiveTab] = useState('list'); // list, bulkEdit, categories
  const [savedPlaylists, setSavedPlaylists] = useState([]);
  const [playlistName, setPlaylistName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showIdExpDialog, setShowIdExpDialog] = useState(false);
  const [extractedData, setExtractedData] = useState({ id: '', expiry: '', server: '' });

  const commonCategories = [
    'Astro', 'Sports', 'News', 'Movies', 'Entertainment', 
    'Kids', 'Documentary', 'Music', 'Religious', 'Shopping',
    'International', 'Local', 'Premium', 'Free', 'Drama', 'Variety'
  ];

  // Load saved playlists from storage on mount
  React.useEffect(() => {
    const loadSavedPlaylists = async () => {
      try {
        const keys = await window.storage.list('playlist:');
        if (keys && keys.keys) {
          const playlists = [];
          for (const key of keys.keys) {
            const data = await window.storage.get(key);
            if (data && data.value) {
              const parsed = JSON.parse(data.value);
              playlists.push(parsed);
            }
          }
          setSavedPlaylists(playlists);
        }
      } catch (error) {
        console.log('No saved playlists found');
      }
    };
    loadSavedPlaylists();
  }, []);

  const parseM3U = (content) => {
    const lines = content.split('\n');
    const parsedChannels = [];
    let currentChannel = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
        const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
        const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
        const groupTitleMatch = line.match(/group-title="([^"]*)"/);
        const nameMatch = line.match(/,(.+)$/);

        currentChannel = {
          tvgId: tvgIdMatch ? tvgIdMatch[1] : '',
          tvgName: tvgNameMatch ? tvgNameMatch[1] : '',
          tvgLogo: tvgLogoMatch ? tvgLogoMatch[1] : '',
          groupTitle: groupTitleMatch ? groupTitleMatch[1] : 'Uncategorized',
          name: nameMatch ? nameMatch[1] : '',
          url: ''
        };
      } else if (line && !line.startsWith('#') && currentChannel.name) {
        currentChannel.url = line;
        parsedChannels.push(currentChannel);
        currentChannel = {};
      }
    }

    return parsedChannels;
  };

  const generateM3U = (channelsToExport = channels) => {
    let content = '#EXTM3U\n';
    channelsToExport.forEach(ch => {
      content += `#EXTINF:-1 tvg-id="${ch.tvgId}" tvg-name="${ch.tvgName}" tvg-logo="${ch.tvgLogo}" group-title="${ch.groupTitle}",${ch.name}\n`;
      content += `${ch.url}\n`;
    });
    return content;
  };

  const categories = useMemo(() => {
    const cats = new Set(channels.map(ch => ch.groupTitle || 'Uncategorized'));
    return ['all', ...Array.from(cats).sort()];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(ch => {
      const matchesCategory = selectedCategory === 'all' || ch.groupTitle === selectedCategory;
      const matchesSearch = ch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ch.groupTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ch.url.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [channels, selectedCategory, searchTerm]);

  const categoryStats = useMemo(() => {
    const stats = {};
    channels.forEach(ch => {
      const cat = ch.groupTitle || 'Uncategorized';
      stats[cat] = (stats[cat] || 0) + 1;
    });
    return stats;
  }, [channels]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setRawContent(content);
        const parsed = parseM3U(content);
        setChannels(parsed);
        setViewMode('visual');
        setSelectedCategory('all');
        setActiveTab('list');
      };
      reader.readAsText(file);
    }
  };

  const handleDownload = () => {
    const channelsToExport = selectedChannels.size > 0 
      ? channels.filter((_, i) => selectedChannels.has(i))
      : (selectedCategory === 'all' ? channels : filteredChannels);
    
    const content = viewMode === 'visual' ? generateM3U(channelsToExport) : rawContent;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = selectedCategory === 'all' ? 'playlist.m3u' : `playlist_${selectedCategory}.m3u`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const content = viewMode === 'visual' ? generateM3U() : rawContent;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addChannel = () => {
    setChannels([...channels, {
      tvgId: '',
      tvgName: '',
      tvgLogo: '',
      groupTitle: selectedCategory !== 'all' ? selectedCategory : 'Uncategorized',
      name: 'Saluran Baru',
      url: 'http://'
    }]);
    setEditingIndex(channels.length);
  };

  const deleteChannel = (index) => {
    setChannels(channels.filter((_, i) => i !== index));
    selectedChannels.delete(index);
    setSelectedChannels(new Set(selectedChannels));
  };

  const updateChannel = (index, field, value) => {
    const updated = [...channels];
    updated[index][field] = value;
    setChannels(updated);
  };

  const bulkUpdateSelected = (field, value) => {
    if (selectedChannels.size === 0) {
      alert('Sila pilih saluran terlebih dahulu!');
      return;
    }
    
    const updated = channels.map((ch, i) => 
      selectedChannels.has(i) ? { ...ch, [field]: value } : ch
    );
    setChannels(updated);
  };

  const toggleChannelSelection = (index) => {
    const newSelected = new Set(selectedChannels);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedChannels(newSelected);
  };

  const selectAllInCategory = () => {
    const newSelected = new Set();
    filteredChannels.forEach((ch) => {
      const originalIndex = channels.indexOf(ch);
      newSelected.add(originalIndex);
    });
    setSelectedChannels(newSelected);
  };

  const clearSelection = () => {
    setSelectedChannels(new Set());
  };

  const changeCategory = (oldCat, newCat) => {
    const updated = channels.map(ch => 
      ch.groupTitle === oldCat ? { ...ch, groupTitle: newCat } : ch
    );
    setChannels(updated);
  };

  const savePlaylist = async () => {
    if (!playlistName.trim()) {
      alert('Sila masukkan nama playlist!');
      return;
    }

    const playlist = {
      name: playlistName,
      channels: channels,
      dateCreated: new Date().toISOString(),
      channelCount: channels.length,
      categories: Object.keys(categoryStats).length
    };

    try {
      const key = `playlist:${playlistName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await window.storage.set(key, JSON.stringify(playlist));
      
      // Update saved playlists list
      const updatedPlaylists = [...savedPlaylists.filter(p => p.name !== playlistName), playlist];
      setSavedPlaylists(updatedPlaylists);
      
      setShowSaveDialog(false);
      setPlaylistName('');
      alert(`✅ Playlist "${playlistName}" berjaya disimpan!`);
    } catch (error) {
      alert('❌ Gagal menyimpan playlist: ' + error.message);
    }
  };

  const loadPlaylist = async (playlist) => {
    if (channels.length > 0) {
      if (!confirm(`Load "${playlist.name}"? Playlist semasa akan diganti.`)) {
        return;
      }
    }

    setChannels(playlist.channels);
    setSelectedCategory('all');
    setSelectedChannels(new Set());
    setShowLoadDialog(false);
    setActiveTab('list');
  };

  const deletePlaylist = async (playlist) => {
    if (!confirm(`Padam playlist "${playlist.name}"?`)) {
      return;
    }

    try {
      const key = `playlist:${playlist.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await window.storage.delete(key);
      setSavedPlaylists(savedPlaylists.filter(p => p.name !== playlist.name));
      alert(`✅ Playlist "${playlist.name}" telah dipadam`);
    } catch (error) {
      alert('❌ Gagal memadamkan playlist: ' + error.message);
    }
  };

  const extractIdAndExpiry = () => {
    if (channels.length === 0) {
      alert('Tiada saluran untuk dianalisa. Sila upload M3U terlebih dahulu.');
      return;
    }

    // Ambil URL dari channel pertama
    const sampleUrl = channels[0].url;
    
    // Extract ID patterns
    let id = '';
    let expiry = '';
    let server = '';

    // Try to extract server
    try {
      const urlObj = new URL(sampleUrl);
      server = urlObj.origin;
    } catch (e) {
      console.log('Invalid URL');
    }

    // Pattern 1: username= or u= or user= or id=
    const usernameMatch = sampleUrl.match(/(?:username|user|u|id)=([^&\s]+)/i);
    if (usernameMatch) {
      id = usernameMatch[1];
    }

    // Pattern 2: /live/USERNAME/ or /get.php/USERNAME/
    const pathUsernameMatch = sampleUrl.match(/\/(?:live|get\.php)\/([^\/\s]+)\//i);
    if (pathUsernameMatch && !id) {
      id = pathUsernameMatch[1];
    }

    // Pattern 3: Numeric ID in path like /12345/
    const numericIdMatch = sampleUrl.match(/\/(\d{4,})\//);
    if (numericIdMatch && !id) {
      id = numericIdMatch[1];
    }

    // Extract Expiry
    // Pattern 1: exp= or expire= or expiry=
    const expiryMatch = sampleUrl.match(/(?:exp|expire|expiry)=(\d+)/i);
    if (expiryMatch) {
      const timestamp = expiryMatch[1];
      // Convert Unix timestamp to date
      const date = new Date(parseInt(timestamp) * 1000);
      expiry = date.toLocaleString('ms-MY');
    }

    // Pattern 2: Look for date pattern in URL
    const dateMatch = sampleUrl.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch && !expiry) {
      expiry = dateMatch[1];
    }

    // Pattern 3: Unix timestamp anywhere in URL
    const timestampMatch = sampleUrl.match(/\b(1\d{9})\b/);
    if (timestampMatch && !expiry) {
      const date = new Date(parseInt(timestampMatch[1]) * 1000);
      expiry = date.toLocaleString('ms-MY');
    }

    setExtractedData({ id, expiry, server });
    setShowIdExpDialog(true);
  };

  const generateNewId = () => {
    const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setExtractedData({ ...extractedData, id: randomId });
  };

  const updateAllUrlsWithNewId = () => {
    if (!extractedData.id) {
      alert('Sila masukkan ID baru terlebih dahulu!');
      return;
    }

    const oldId = channels[0]?.url.match(/(?:username|user|u|id)=([^&\s]+)/i)?.[1] || 
                  channels[0]?.url.match(/\/(?:live|get\.php)\/([^\/\s]+)\//i)?.[1];

    if (!oldId) {
      alert('Tidak dapat mengesan ID lama dalam URL');
      return;
    }

    const updated = channels.map(ch => ({
      ...ch,
      url: ch.url.replace(new RegExp(oldId, 'g'), extractedData.id)
    }));

    setChannels(updated);
    alert(`✅ ${channels.length} URL telah dikemaskini dengan ID baru!`);
    setShowIdExpDialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-300" />
              <div>
                <h1 className="text-3xl font-bold text-white">M3U IPTV Editor Pro</h1>
                <p className="text-purple-300 text-sm">
                  {channels.length} saluran | {Object.keys(categoryStats).length} kategori
                  {selectedChannels.size > 0 && ` | ${selectedChannels.size} terpilih`}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('visual')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'visual' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                Visual
              </button>
              <button
                onClick={() => {
                  if (viewMode === 'visual') {
                    setRawContent(generateM3U());
                  }
                  setViewMode('raw');
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'raw' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                Raw
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-6">
            <label className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer text-center">
              <Upload className="w-5 h-5 inline mr-2" />
              Upload M3U
              <input
                type="file"
                accept=".m3u,.m3u8,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={channels.length === 0}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-5 h-5 inline mr-2" />
              Simpan
            </button>

            <button
              onClick={() => setShowLoadDialog(true)}
              className="px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
            >
              <FolderOpen className="w-5 h-5 inline mr-2" />
              Load ({savedPlaylists.length})
            </button>

            <button
              onClick={extractIdAndExpiry}
              disabled={channels.length === 0}
              className="px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <Key className="w-5 h-5 inline mr-2" />
              ID & Exp
            </button>
            
            {viewMode === 'visual' && (
              <>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'list' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-white/10 text-purple-200 hover:bg-white/20'
                  }`}
                >
                  <FileText className="w-5 h-5 inline mr-2" />
                  Senarai
                </button>
                
                <button
                  onClick={() => setActiveTab('bulkEdit')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'bulkEdit' 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-white/10 text-purple-200 hover:bg-white/20'
                  }`}
                >
                  <Edit2 className="w-5 h-5 inline mr-2" />
                  Edit Pukal
                </button>
                
                <button
                  onClick={() => setActiveTab('categories')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'categories' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white/10 text-purple-200 hover:bg-white/20'
                  }`}
                >
                  <FolderOpen className="w-5 h-5 inline mr-2" />
                  Kategori
                </button>
                
                <button
                  onClick={() => setActiveTab('selection')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'selection' 
                      ? 'bg-pink-600 text-white' 
                      : 'bg-white/10 text-purple-200 hover:bg-white/20'
                  }`}
                >
                  <CheckSquare className="w-5 h-5 inline mr-2" />
                  Pilih ({selectedChannels.size})
                </button>
              </>
            )}
          </div>

          {viewMode === 'visual' ? (
            <>
              {/* Filter Bar */}
              <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-purple-200 mb-2 font-medium">
                      <Filter className="w-4 h-4 inline mr-1" />
                      Filter Kategori
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    >
                      <option value="all">🌐 Semua Kategori ({channels.length})</option>
                      {Object.entries(categoryStats).sort().map(([cat, count]) => (
                        <option key={cat} value={cat}>
                          📂 {cat} ({count})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-purple-200 mb-2 font-medium">
                      <Search className="w-4 h-4 inline mr-1" />
                      Cari Saluran
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nama, kategori atau URL..."
                      className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'list' && (
                <div className="space-y-3 max-h-96 overflow-y-auto bg-black/20 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white font-semibold">Senarai Saluran ({filteredChannels.length})</h3>
                    <button
                      onClick={addChannel}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Tambah
                    </button>
                  </div>
                  
                  {filteredChannels.map((channel) => {
                    const originalIndex = channels.indexOf(channel);
                    const isSelected = selectedChannels.has(originalIndex);
                    const isEditing = editingIndex === originalIndex;
                    
                    return (
                      <div 
                        key={originalIndex} 
                        className={`bg-white/5 rounded-lg p-4 border transition-all ${
                          isSelected ? 'border-amber-400 bg-amber-500/10' : 'border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleChannelSelection(originalIndex)}
                              className="w-5 h-5 rounded bg-white/10 border-white/30 text-purple-600 focus:ring-2 focus:ring-purple-400 cursor-pointer"
                            />
                            {channel.tvgLogo && (
                              <img 
                                src={channel.tvgLogo} 
                                alt={channel.name}
                                className="w-12 h-12 object-contain rounded bg-white/10 p-1"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-semibold truncate">{channel.name}</h3>
                              <p className="text-purple-300 text-sm">📂 {channel.groupTitle}</p>
                              {!isEditing && (
                                <p className="text-gray-400 text-xs truncate mt-1">🔗 {channel.url}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingIndex(isEditing ? null : originalIndex)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                              {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => deleteChannel(originalIndex)}
                              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10">
                            <div>
                              <label className="block text-sm text-purple-200 mb-1">Nama Saluran</label>
                              <input
                                type="text"
                                value={channel.name}
                                onChange={(e) => updateChannel(originalIndex, 'name', e.target.value)}
                                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-purple-200 mb-1">Kategori</label>
                              <select
                                value={channel.groupTitle}
                                onChange={(e) => updateChannel(originalIndex, 'groupTitle', e.target.value)}
                                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                              >
                                {commonCategories.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm text-purple-200 mb-1">Logo URL</label>
                              <input
                                type="text"
                                value={channel.tvgLogo}
                                onChange={(e) => updateChannel(originalIndex, 'tvgLogo', e.target.value)}
                                placeholder="https://example.com/logo.png"
                                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm text-purple-200 mb-1">Stream URL</label>
                              <input
                                type="text"
                                value={channel.url}
                                onChange={(e) => updateChannel(originalIndex, 'url', e.target.value)}
                                placeholder="http://server.com/stream.m3u8"
                                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredChannels.length === 0 && channels.length > 0 && (
                    <div className="text-center py-8 text-purple-300">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Tiada saluran dijumpai</p>
                    </div>
                  )}

                  {channels.length === 0 && (
                    <div className="text-center py-12 text-purple-300">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Upload fail M3U untuk mula</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'bulkEdit' && (
                <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-lg p-6">
                  <h3 className="text-white font-bold text-xl mb-2 flex items-center gap-2">
                    <Edit2 className="w-6 h-6" />
                    Edit Pukal - {selectedChannels.size} Saluran Terpilih
                  </h3>
                  <p className="text-amber-200 text-sm mb-6">Pilih saluran dari tab "Senarai" atau "Pilih" untuk edit beramai-ramai</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Edit URL */}
                    <div className="bg-black/30 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Link className="w-5 h-5 text-blue-400" />
                        Edit URL
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-white mb-1">Ganti URL Penuh</label>
                          <input
                            type="text"
                            placeholder="http://server.com/stream.m3u8"
                            onBlur={(e) => e.target.value && bulkUpdateSelected('url', e.target.value)}
                            className="w-full px-3 py-2 bg-white/20 border border-white/40 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-white mb-1">Tambah Prefix</label>
                          <input
                            type="text"
                            placeholder="http://server.com/"
                            onBlur={(e) => {
                              if (e.target.value) {
                                const updated = channels.map((ch, i) => 
                                  selectedChannels.has(i) ? { ...ch, url: e.target.value + (ch.url.includes('://') ? ch.url.split('://')[1] : ch.url) } : ch
                                );
                                setChannels(updated);
                              }
                            }}
                            className="w-full px-3 py-2 bg-white/20 border border-white/40 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Edit Kategori */}
                    <div className="bg-black/30 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-green-400" />
                        Edit Kategori
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-white mb-1">Tukar ke Kategori</label>
                          <select
                            onChange={(e) => e.target.value && bulkUpdateSelected('groupTitle', e.target.value)}
                            className="w-full px-3 py-2 bg-white/20 border border-white/40 rounded-lg text-white text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                          >
                            <option value="">Pilih kategori...</option>
                            {commonCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-white mb-1">Atau Taipkan Baru</label>
                          <input
                            type="text"
                            placeholder="Kategori Custom"
                            onBlur={(e) => e.target.value && bulkUpdateSelected('groupTitle', e.target.value)}
                            className="w-full px-3 py-2 bg-white/20 border border-white/40 rounded-lg text-white text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Edit Logo */}
                    <div className="bg-black/30 rounded-lg p-4 md:col-span-2">
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Image className="w-5 h-5 text-purple-400" />
                        Edit Logo
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-white mb-1">Logo URL untuk Semua</label>
                          <input
                            type="text"
                            placeholder="https://example.com/logo.png"
                            onBlur={(e) => e.target.value && bulkUpdateSelected('tvgLogo', e.target.value)}
                            className="w-full px-3 py-2 bg-white/20 border border-white/40 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                          />
                          <p className="text-xs text-gray-300 mt-1">💡 Tip: Guna URL penuh dengan https://</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedChannels.size === 0 && (
                    <div className="mt-6 text-center py-8 bg-black/20 rounded-lg">
                      <CheckSquare className="w-12 h-12 mx-auto mb-3 text-amber-300 opacity-50" />
                      <p className="text-white">Pilih saluran terlebih dahulu untuk edit pukal</p>
                      <p className="text-amber-200 text-sm mt-1">Pergi ke tab "Senarai" atau "Pilih"</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'categories' && (
                <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/50 rounded-lg p-6">
                  <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                    <FolderOpen className="w-6 h-6" />
                    Urus Kategori
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                      <div key={cat} className="bg-black/30 rounded-lg p-4 border border-white/20">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-white font-semibold">📂 {cat}</h4>
                            <p className="text-purple-300 text-sm">{count} saluran</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              setSelectedCategory(cat);
                              setActiveTab('list');
                            }}
                            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                          >
                            Lihat Saluran
                          </button>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                changeCategory(cat, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="w-full px-3 py-2 bg-white/20 border border-white/40 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                          >
                            <option value="">Tukar ke...</option>
                            {commonCategories.filter(c => c !== cat).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  {Object.keys(categoryStats).length === 0 && (
                    <div className="text-center py-12 text-purple-300">
                      <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Tiada kategori lagi</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'selection' && (
                <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/50 rounded-lg p-6">
                  <h3 className="text-white font-bold text-xl mb-2 flex items-center gap-2">
                    <CheckSquare className="w-6 h-6" />
                    Pilih Playlist
                  </h3>
                  <p className="text-pink-200 text-sm mb-6">Pilih saluran untuk edit, export atau padam</p>

                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={selectAllInCategory}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4 inline mr-2" />
                      Pilih Semua ({filteredChannels.length})
                    </button>
                    <button
                      onClick={clearSelection}
                      disabled={selectedChannels.size === 0}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 inline mr-2" />
                      Clear Pilihan
                    </button>
                    <button
                      onClick={() => {
                        if (selectedChannels.size > 0 && confirm(`Padam ${selectedChannels.size} saluran terpilih?`)) {
                          setChannels(channels.filter((_, i) => !selectedChannels.has(i)));
                          setSelectedChannels(new Set());
                        }
                      }}
                      disabled={selectedChannels.size === 0}
                      className="px-4 py-2 bg-red-700 hover:bg-red-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 inline mr-2" />
                      Padam Terpilih
                    </button>
                  </div>

                  <div className="bg-black/30 rounded-lg p-4 mb-4">
                    <h4 className="text-white font-semibold mb-2">📊 Statistik Pilihan</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-3xl font-bold text-pink-400">{selectedChannels.size}</p>
                        <p className="text-sm text-gray-300">Terpilih</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-blue-400">{channels.length}</p>
                        <p className="text-sm text-gray-300">Jumlah</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-green-400">
                          {selectedChannels.size > 0 ? Math.round(selectedChannels.size / channels.length * 100) : 0}%
                        </p>
                        <p className="text-sm text-gray-300">Peratus</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-purple-400">{filteredChannels.length}</p>
                        <p className="text-sm text-gray-300">Filter</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredChannels.map((channel) => {
                      const originalIndex = channels.indexOf(channel);
                      const isSelected = selectedChannels.has(originalIndex);
                      
                      return (
                        <div
                          key={originalIndex}
                          onClick={() => toggleChannelSelection(originalIndex)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-pink-500/30 border-2 border-pink-400' 
                              : 'bg-black/20 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-5 h-5 rounded bg-white/10 border-white/30 text-pink-600 focus:ring-2 focus:ring-pink-400 cursor-pointer"
                          />
                          {channel.tvgLogo && (
                            <img 
                              src={channel.tvgLogo} 
                              alt={channel.name}
                              className="w-10 h-10 object-contain rounded bg-white/10 p-1"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold truncate">{channel.name}</h4>
                            <p className="text-purple-300 text-sm truncate">{channel.groupTitle}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredChannels.length === 0 && (
                    <div className="text-center py-12 text-purple-300">
                      <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Tiada saluran untuk dipilih</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm text-purple-200 mb-2 font-medium">Raw M3U Code</label>
              <textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                className="w-full h-96 px-4 py-3 bg-slate-950/50 border border-white/30 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none resize-none"
                placeholder="Kandungan M3U akan muncul di sini..."
              />
            </div>
          )}

          {/* Download Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleDownload}
              disabled={channels.length === 0 && !rawContent}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Muat Turun
              {selectedChannels.size > 0 && ` (${selectedChannels.size} terpilih)`}
              {selectedChannels.size === 0 && selectedCategory !== 'all' && ` (${filteredChannels.length} ${selectedCategory})`}
            </button>
            <button
              onClick={handleCopy}
              disabled={channels.length === 0 && !rawContent}
              className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Disalin!' : 'Salin ke Clipboard'}
            </button>
          </div>

          {/* Info Tips */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-semibold mb-2">💡 Tips Edit URL</h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Guna "Ganti URL Penuh" untuk set URL baru</li>
                <li>• Guna "Tambah Prefix" untuk tukar server sahaja</li>
                <li>• Contoh prefix: http://server.com/live/</li>
              </ul>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-green-300 font-semibold mb-2">🎯 Tips Edit Kategori</h4>
              <ul className="text-sm text-green-200 space-y-1">
                <li>• Pilih kategori popular atau taipkan sendiri</li>
                <li>• Guna tab "Kategori" untuk tukar keseluruhan kategori</li>
                <li>• Filter kategori sebelum edit untuk lebih mudah</li>
              </ul>
            </div>
          </div>

          {/* Save Dialog */}
          {showSaveDialog && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/50">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Save className="w-6 h-6" />
                  Simpan Playlist
                </h3>
                <p className="text-purple-200 mb-4">
                  Playlist akan disimpan dalam browser. Anda boleh load semula bila-bila masa.
                </p>
                <div className="mb-4">
                  <label className="block text-sm text-purple-200 mb-2">Nama Playlist</label>
                  <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="Contoh: Astro HD, Premium Channels..."
                    className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && savePlaylist()}
                  />
                </div>
                <div className="bg-purple-500/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-purple-200">
                    📊 {channels.length} saluran | {Object.keys(categoryStats).length} kategori
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={savePlaylist}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveDialog(false);
                      setPlaylistName('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Load Dialog */}
          {showLoadDialog && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-cyan-900 to-slate-900 rounded-2xl p-6 max-w-2xl w-full border border-cyan-500/50 max-h-[80vh] overflow-hidden flex flex-col">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <FolderOpen className="w-6 h-6" />
                  Load Playlist Tersimpan
                </h3>
                
                {savedPlaylists.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-cyan-300 opacity-50" />
                    <p className="text-cyan-200">Tiada playlist tersimpan lagi</p>
                    <p className="text-sm text-gray-400 mt-2">Simpan playlist anda untuk akses cepat</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto flex-1 mb-4">
                    {savedPlaylists.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)).map((playlist, idx) => (
                      <div key={idx} className="bg-black/30 rounded-lg p-4 border border-cyan-500/30 hover:border-cyan-500/60 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-white font-semibold text-lg mb-1">{playlist.name}</h4>
                            <div className="flex gap-4 text-sm text-cyan-200 mb-2">
                              <span>📺 {playlist.channelCount} saluran</span>
                              <span>📂 {playlist.categories} kategori</span>
                            </div>
                            <p className="text-xs text-gray-400">
                              💾 Disimpan: {new Date(playlist.dateCreated).toLocaleString('ms-MY')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => loadPlaylist(playlist)}
                              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => deletePlaylist(playlist)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => setShowLoadDialog(false)}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          {/* ID & Expiry Dialog */}
          {showIdExpDialog && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-orange-900 to-slate-900 rounded-2xl p-6 max-w-2xl w-full border border-orange-500/50">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Key className="w-6 h-6" />
                  Tarik ID & Expiry dari URL
                </h3>
                
                <div className="bg-black/30 rounded-lg p-4 mb-4">
                  <p className="text-orange-200 text-sm mb-2">
                    📡 Menganalisa URL dari {channels.length} saluran...
                  </p>
                  <p className="text-xs text-gray-400 font-mono break-all">
                    Sampel: {channels[0]?.url.substring(0, 100)}...
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Server Info */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <label className="block text-sm text-blue-200 mb-2 font-semibold">
                      🌐 Server URL
                    </label>
                    <input
                      type="text"
                      value={extractedData.server}
                      onChange={(e) => setExtractedData({ ...extractedData, server: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:outline-none font-mono text-sm"
                      placeholder="http://server.com"
                    />
                  </div>

                  {/* ID */}
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <label className="block text-sm text-green-200 mb-2 font-semibold">
                      🔑 User ID / Username
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={extractedData.id}
                        onChange={(e) => setExtractedData({ ...extractedData, id: e.target.value })}
                        className="flex-1 px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:outline-none font-mono text-sm"
                        placeholder={extractedData.id || "Tidak dijumpai"}
                      />
                      <button
                        onClick={generateNewId}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        title="Generate ID Random"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    {extractedData.id && (
                      <p className="text-xs text-green-300 mt-2">✅ ID dijumpai dari URL</p>
                    )}
                  </div>

                  {/* Expiry */}
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <label className="block text-sm text-purple-200 mb-2 font-semibold">
                      📅 Tarikh Tamat Tempoh
                    </label>
                    <input
                      type="text"
                      value={extractedData.expiry}
                      onChange={(e) => setExtractedData({ ...extractedData, expiry: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:outline-none font-mono text-sm"
                      placeholder={extractedData.expiry || "Tidak dijumpai"}
                    />
                    {extractedData.expiry && (
                      <p className="text-xs text-purple-300 mt-2">✅ Expiry dijumpai dari URL</p>
                    )}
                  </div>
                </div>

                <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg p-4 mb-4">
                  <h4 className="text-orange-200 font-semibold mb-2">💡 Apa yang boleh dibuat?</h4>
                  <ul className="text-sm text-orange-100 space-y-1">
                    <li>• Copy ID untuk backup atau guna di tempat lain</li>
                    <li>• Check tarikh expiry untuk tahu bila perlu renew</li>
                    <li>• Ganti ID lama dengan ID baru untuk semua URL</li>
                    <li>• Generate ID random untuk testing</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={updateAllUrlsWithNewId}
                    disabled={!extractedData.id}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    Ganti ID Semua URL
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
                      alert('✅ Data telah disalin ke clipboard!');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Copy className="w-4 h-4 inline mr-2" />
                    Copy
                  </button>
                  <button
                    onClick={() => setShowIdExpDialog(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
