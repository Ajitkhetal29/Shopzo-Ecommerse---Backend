const reverseGeocode = async (req, res) => {
 try {
    const { lat, lng } = req.params;
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
        headers: {
            'User-Agent': 'shopzo-backend'
        }
    });
    if (!response.ok) {
        throw new Error("Failed to fetch address");
    }
    const data = await response.json();
    console.log("Address:", data);
    res.status(200).json({ display_name: data.display_name, address: data.address });
 } catch (error) {
    res.status(500).json({ message: error.message });
 }
}

export default reverseGeocode;