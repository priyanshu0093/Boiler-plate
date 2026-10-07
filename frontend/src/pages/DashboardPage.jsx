import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getResources } from '../api/client';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import ResourceGrid from '../components/ResourceGrid';
import ResourceDetails from '../components/ResourceDetails';
import BookingModal from '../components/BookingModal';
import UpcomingBookingCountdown from '../components/UpcomingBookingCountdown';

export default function DashboardPage() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Selected resource for details modal
  const [selectedResourceId, setSelectedResourceId] = useState(null);

  // Selected resource for booking modal
  const [bookingModalResource, setBookingModalResource] = useState(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch resources from backend
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getResources({
        category: selectedCategory,
        status: selectedStatus,
        search: debouncedSearch
      });
      if (res.success) {
        setResources(res.data);
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch resources:', err);
      setError(err.message || 'Unable to connect to server to load resources.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, debouncedSearch]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // REAL-TIME SOCKET.IO LISTENERS: Update affected resource/booking state without page reload
  useEffect(() => {
    if (!socket) return;

    const handleStatusChanged = (payload) => {
      const { resourceId, status } = payload;
      if (!resourceId || !status) return;

      setResources((prevResources) =>
        prevResources.map((res) => {
          if (res._id === resourceId) {
            return { ...res, status };
          }
          return res;
        })
      );
    };

    const handleBookingCreated = () => {
      // Seamlessly refresh resource cards if needed
      fetchResources();
    };

    socket.on('resource:status_changed', handleStatusChanged);
    socket.on('booking:created', handleBookingCreated);

    return () => {
      socket.off('resource:status_changed', handleStatusChanged);
      socket.off('booking:created', handleBookingCreated);
    };
  }, [socket, fetchResources]);

  // Personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Employee';

  return (
    <main className="main-content">
      <header className="dashboard-header">
        <div className="greeting-row">
          <h1 className="greeting-title">
            {getGreeting()}, {firstName}
          </h1>
          <p className="greeting-sub">
            Real-time status and availability of shared office facilities & equipment.
          </p>
        </div>

        {/* Live Upcoming Booking Countdown / Active Booking Banner */}
        <UpcomingBookingCountdown
          onBrowseResources={() => {
            document.querySelector('.control-bar')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onBookingUpdated={() => {
            fetchResources();
          }}
        />

        {/* Controls: Search & Category/Status Filters */}
        <section className="control-bar" aria-label="Resource filters">
          <div className="search-and-status-row">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by equipment name, location, or tag..."
            />
          </div>

          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedStatus={selectedStatus}
            onSelectStatus={setSelectedStatus}
          />
        </section>
      </header>

      {/* Catalog Meta: Count & Live Status */}
      <div className="catalog-meta-row">
        <span className="resource-count">
          {loading ? 'Fetching catalog...' : `${resources.length} Resource${resources.length === 1 ? '' : 's'} Available`}
        </span>
      </div>

      {/* Resource Cards Grid */}
      <ResourceGrid
        resources={resources}
        loading={loading}
        error={error}
        onSelectResource={(res) => setSelectedResourceId(res._id)}
        onBookResource={(res) => setBookingModalResource(res)}
        onRetry={fetchResources}
      />

      {/* Resource Details Modal */}
      {selectedResourceId && (
        <ResourceDetails
          resourceId={selectedResourceId}
          onClose={() => setSelectedResourceId(null)}
          onBookResource={(res) => setBookingModalResource(res)}
        />
      )}

      {/* Booking Modal */}
      {bookingModalResource && (
        <BookingModal
          resource={bookingModalResource}
          isOpen={!!bookingModalResource}
          onClose={() => setBookingModalResource(null)}
          onSuccess={() => fetchResources()}
        />
      )}
    </main>
  );
}
