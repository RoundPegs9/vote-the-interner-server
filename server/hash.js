class Hash {
    constructor(M, P) {
      this.M = M;
      this.P = P;
    }

    /**
     * Converts a string into an integer hash value
     * @param {String} data data to convert the hash value for (string)
     * @returns {Integer} returns an Int of the corresponding hash value for the string (data)
     */
    get_str_hash(data)
    {
        data = String(data);
        var hash_Int = 0;
        for(var i = data.length - 1; i >= 0; i--)
        {
            hash_Int += (hash_Int*this.X + data.charCodeAt(i))%this.P;
            
        }
        return hash_Int;
    }
    /**
     * Sets the index multiplication for primal value for str hash function.
     * Need to do this before calling {get_str_hash}
     * @param {Integer} X the primal function for string based hash function
     */
    setPrimeString(X)
    {
        this.X = X;
    }
  }

module.exports = Hash;